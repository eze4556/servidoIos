import { MercadoPagoConfig, PreApproval } from "mercadopago"
import { auth as adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore"
import type { SubscriptionPricing } from "@/types/subscription"

export type SubscriptionPlanType = "basic" | "premium" | "enterprise"

export type CreateRecurringSubscriptionPayload = {
  userId: string
  planType: SubscriptionPlanType | string
  returnPath?: string
  payerEmail?: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DEFAULT_SUBSCRIPTION_PRICE = 29.99

function getPlatformAccessToken() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
  }
  return accessToken
}

function createPreApprovalClient() {
  return new PreApproval(new MercadoPagoConfig({ accessToken: getPlatformAccessToken() }))
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) return null
  return authorizationHeader.slice(7).trim()
}

export async function requireAuthenticatedUserId(request: Request, expectedUserId?: string) {
  const token = getBearerToken(request)
  if (!token) {
    throw new Error("No autorizado")
  }

  const decoded = await adminAuth.verifyIdToken(token)
  if (expectedUserId && decoded.uid !== expectedUserId) {
    throw new Error("El usuario autenticado no coincide con userId")
  }

  return decoded
}

export function buildSubscriptionExternalReference(userId: string, planType: string) {
  return `subscription_${userId}_${planType || "basic"}`
}

export function parseSubscriptionExternalReference(externalReference: string): {
  userId: string
  planType: string
} | null {
  if (!externalReference.startsWith("subscription_")) return null

  const rest = externalReference.slice("subscription_".length)
  const lastUnderscore = rest.lastIndexOf("_")
  if (lastUnderscore <= 0) {
    return rest ? { userId: rest, planType: "basic" } : null
  }

  const userId = rest.slice(0, lastUnderscore)
  const planType = rest.slice(lastUnderscore + 1) || "basic"
  if (!userId) return null
  return { userId, planType }
}

export function resolveSubscriptionDashboardPath(returnPath?: string) {
  return returnPath === "/dashboard/restaurant" || returnPath === "restaurant"
    ? "/dashboard/restaurant"
    : "/dashboard/seller"
}

export async function getActiveSubscriptionPrice(): Promise<number> {
  const pricingRef = collection(db, "subscriptionPricing")
  const q = query(pricingRef, where("isActive", "==", true), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return DEFAULT_SUBSCRIPTION_PRICE

  const activePricing = snapshot.docs[0].data() as SubscriptionPricing
  const price = Number(activePricing.price)
  return Number.isFinite(price) && price > 0 ? price : DEFAULT_SUBSCRIPTION_PRICE
}

export async function syncRestaurantSubscriptionFlag(userId: string, active: boolean) {
  try {
    const userSnap = await getDoc(doc(db, "users", userId))
    if (!userSnap.exists()) return
    const userData = userSnap.data() as { restaurantId?: string; businessType?: string }
    const restaurantId = userData.restaurantId
    if (!restaurantId || userData.businessType !== "restaurant") return

    await setDoc(
      doc(db, "restaurants", restaurantId),
      {
        subscriptionActive: active,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  } catch (err) {
    console.error("syncRestaurantSubscriptionFlag failed:", err)
  }
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function resolvePeriodEnd(params?: {
  nextPaymentDate?: string | null
  paymentDate?: string | Date | null
}) {
  if (params?.nextPaymentDate) {
    const parsed = new Date(params.nextPaymentDate)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const base =
    params?.paymentDate instanceof Date
      ? params.paymentDate
      : params?.paymentDate
        ? new Date(params.paymentDate)
        : new Date()

  if (Number.isNaN(base.getTime())) {
    return addMonths(new Date(), 1)
  }

  return addMonths(base, 1)
}

export async function activateUserSubscription(params: {
  userId: string
  planType?: string
  paymentId?: string | number | null
  preapprovalId?: string | null
  preapprovalStatus?: string | null
  amount?: number | null
  paymentStatusRaw?: string | null
  nextPaymentDate?: string | null
  paymentDate?: string | Date | null
}) {
  const {
    userId,
    planType = "basic",
    paymentId = null,
    preapprovalId = null,
    preapprovalStatus = "authorized",
    amount = null,
    paymentStatusRaw = "approved",
    nextPaymentDate = null,
    paymentDate = null,
  } = params

  const existingUserSnap = await getDoc(doc(db, "users", userId))
  const existingUser = existingUserSnap.exists() ? (existingUserSnap.data() as any) : {}
  const now = paymentDate instanceof Date ? paymentDate : paymentDate ? new Date(paymentDate) : new Date()
  const startDate = existingUser?.subscription?.startDate
    ? existingUser.subscription.startDate
    : now
  const endDate = resolvePeriodEnd({ nextPaymentDate, paymentDate: now })
  const paymentDocumentId = paymentId != null ? String(paymentId) : `preapproval_${preapprovalId || userId}_${Date.now()}`

  await runTransaction(db, async (transaction) => {
    transaction.set(
      doc(db, "users", userId),
      {
        role: existingUser.role || "seller",
        businessType: existingUser.businessType || undefined,
        restaurantId: existingUser.restaurantId || undefined,
        subscription_status: "active",
        isSubscribed: true,
        subscription: {
          status: "active",
          plan: planType,
          billingMode: "recurring",
          startDate,
          endDate,
          lastPaymentDate: now,
          paymentId: paymentId != null ? String(paymentId) : existingUser?.subscription?.paymentId || null,
          paymentStatusRaw,
          preapprovalId: preapprovalId || existingUser?.subscription?.preapprovalId || null,
          preapprovalStatus: preapprovalStatus || existingUser?.subscription?.preapprovalStatus || null,
          nextPaymentDate: nextPaymentDate || null,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    transaction.set(
      doc(db, "subscriptions", paymentDocumentId),
      {
        id: paymentDocumentId,
        userId,
        planType,
        paymentId: paymentId != null ? String(paymentId) : null,
        preapprovalId: preapprovalId || null,
        billingMode: "recurring",
        autoRenew: true,
        status: "active",
        paymentStatusRaw,
        startDate,
        endDate,
        amount: amount ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    )

    if (paymentId != null) {
      transaction.set(
        doc(db, "transactions", paymentDocumentId),
        {
          id: paymentDocumentId,
          userId,
          amount: amount ?? null,
          status: paymentStatusRaw,
          paymentStatusRaw,
          paymentId: String(paymentId),
          preapprovalId: preapprovalId || null,
          planType,
          type: "subscription",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      )
    }
  })

  await syncRestaurantSubscriptionFlag(userId, true)
}

export async function deactivateUserSubscription(params: {
  userId: string
  reason?: string
  preapprovalId?: string | null
  preapprovalStatus?: string | null
}) {
  const { userId, reason = "cancelled", preapprovalId = null, preapprovalStatus = "cancelled" } = params
  const existingUserSnap = await getDoc(doc(db, "users", userId))
  const existingUser = existingUserSnap.exists() ? (existingUserSnap.data() as any) : {}

  await setDoc(
    doc(db, "users", userId),
    {
      subscription_status: "inactive",
      isSubscribed: false,
      subscription: {
        ...(existingUser.subscription || {}),
        status: "inactive",
        autoRenew: false,
        cancelAtPeriodEnd: false,
        preapprovalId: preapprovalId || existingUser?.subscription?.preapprovalId || null,
        preapprovalStatus,
        deactivatedAt: new Date(),
        deactivationReason: reason,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  )

  await syncRestaurantSubscriptionFlag(userId, false)
}

/**
 * Cancela la renovación en MP.
 * Si todavía queda período pagado, el usuario sigue operando hasta endDate.
 */
export async function cancelRecurringSubscription(request: Request) {
  const decoded = await requireAuthenticatedUserId(request)
  const userId = decoded.uid

  const userSnap = await getDoc(doc(db, "users", userId))
  if (!userSnap.exists()) {
    throw new Error("Usuario no encontrado")
  }

  const userData = userSnap.data() as any
  const subscription = userData.subscription || {}
  const preapprovalId = subscription.preapprovalId || null
  const endsAt = normalizeSubscriptionDate(subscription.endDate)
  const now = new Date()
  const hasRemainingAccess = Boolean(endsAt && endsAt.getTime() > now.getTime())

  if (subscription.cancelAtPeriodEnd && (subscription.preapprovalStatus === "cancelled" || !preapprovalId)) {
    return {
      userId,
      cancelled: true,
      accessUntil: endsAt ? endsAt.toISOString() : null,
      immediate: !hasRemainingAccess,
      alreadyCancelled: true,
    }
  }

  if (preapprovalId) {
    const client = createPreApprovalClient()
    try {
      await client.update({
        id: String(preapprovalId),
        body: { status: "cancelled" },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar en Mercado Pago"
      // Si ya estaba cancelada en MP, seguimos igual en Servido
      if (!message.toLowerCase().includes("cancelled") && !message.toLowerCase().includes("cancel")) {
        console.error("cancel preapproval failed:", err)
        throw new Error("No se pudo cancelar la suscripción en Mercado Pago. Intentá de nuevo.")
      }
    }
  }

  if (hasRemainingAccess) {
    await setDoc(
      doc(db, "users", userId),
      {
        subscription_status: "active",
        isSubscribed: true,
        subscription: {
          ...subscription,
          status: "active",
          autoRenew: false,
          cancelAtPeriodEnd: true,
          preapprovalId,
          preapprovalStatus: "cancelled",
          cancelledAt: now,
          deactivationReason: "user_cancelled",
        },
        updatedAt: now,
      },
      { merge: true }
    )

    if (preapprovalId) {
      await setDoc(
        doc(db, "subscriptionPreapprovals", String(preapprovalId)),
        {
          status: "cancelled",
          cancelAtPeriodEnd: true,
          cancelledAt: now,
          updatedAt: now,
        },
        { merge: true }
      )
    }

    return {
      userId,
      cancelled: true,
      accessUntil: endsAt!.toISOString(),
      immediate: false,
      alreadyCancelled: false,
    }
  }

  await deactivateUserSubscription({
    userId,
    reason: "user_cancelled",
    preapprovalId,
    preapprovalStatus: "cancelled",
  })

  return {
    userId,
    cancelled: true,
    accessUntil: null,
    immediate: true,
    alreadyCancelled: false,
  }
}

function normalizeSubscriptionDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export async function createRecurringSubscription(request: Request, body: CreateRecurringSubscriptionPayload) {
  const { userId, planType, returnPath, payerEmail } = body

  if (!userId || !planType) {
    throw new Error("userId y planType son requeridos")
  }

  const decoded = await requireAuthenticatedUserId(request, userId)
  const siteUrl = getMercadoPagoSiteUrl(request)
  const dashboardPath = resolveSubscriptionDashboardPath(returnPath)
  const subscriptionPrice = await getActiveSubscriptionPrice()

  const userSnap = await getDoc(doc(db, "users", userId))
  const userData = userSnap.exists() ? (userSnap.data() as any) : {}
  const email =
    (typeof payerEmail === "string" && payerEmail.trim()) ||
    (typeof decoded.email === "string" && decoded.email.trim()) ||
    (typeof userData.email === "string" && userData.email.trim()) ||
    ""

  if (!email) {
    throw new Error("Se necesita el email del usuario para crear la suscripción recurrente")
  }

  const externalReference = buildSubscriptionExternalReference(userId, planType)
  const preApprovalClient = createPreApprovalClient()

  const result = await preApprovalClient.create({
    body: {
      reason: `Suscripción Servido (${planType})`,
      external_reference: externalReference,
      payer_email: email,
      back_url: `${siteUrl}${dashboardPath}?subscription=success`,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: subscriptionPrice,
        currency_id: "ARS",
      },
    },
  })

  if (!result.id || !result.init_point) {
    throw new Error("Mercado Pago no devolvió el enlace de suscripción")
  }

  await setDoc(
    doc(db, "users", userId),
    {
      subscription: {
        ...(userData.subscription || {}),
        plan: planType,
        billingMode: "recurring",
        preapprovalId: result.id,
        preapprovalStatus: result.status || "pending",
        autoRenew: true,
        pendingAt: new Date(),
      },
      updatedAt: new Date(),
    },
    { merge: true }
  )

  await setDoc(
    doc(db, "subscriptionPreapprovals", result.id),
    {
      id: result.id,
      userId,
      planType,
      externalReference,
      status: result.status || "pending",
      amount: subscriptionPrice,
      payerEmail: email,
      initPoint: result.init_point,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  )

  return {
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.init_point,
    billingMode: "recurring" as const,
    amount: subscriptionPrice,
    external_reference: externalReference,
  }
}

export async function fetchMercadoPagoPreapproval(preapprovalId: string) {
  const client = createPreApprovalClient()
  return client.get({ id: preapprovalId })
}

export async function fetchMercadoPagoAuthorizedPayment(authorizedPaymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
    headers: {
      Authorization: `Bearer ${getPlatformAccessToken()}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error consultando authorized_payment: ${response.status} ${errorText}`)
  }

  return response.json()
}

export async function syncSubscriptionFromPreapproval(preapproval: {
  id?: string
  status?: string
  external_reference?: string | null
  next_payment_date?: string | null
  auto_recurring?: { transaction_amount?: number | null } | null
  summarized?: { last_charged_date?: string | null } | null
}) {
  const preapprovalId = preapproval.id
  if (!preapprovalId) {
    throw new Error("Preapproval sin id")
  }

  const parsed = parseSubscriptionExternalReference(String(preapproval.external_reference || ""))
  let userId = parsed?.userId || null
  let planType = parsed?.planType || "basic"

  if (!userId) {
    const stored = await getDoc(doc(db, "subscriptionPreapprovals", preapprovalId))
    if (stored.exists()) {
      const data = stored.data() as any
      userId = data.userId || null
      planType = data.planType || planType
    }
  }

  if (!userId) {
    throw new Error("No se pudo resolver el usuario de la suscripción")
  }

  const status = String(preapproval.status || "").toLowerCase()

  await setDoc(
    doc(db, "subscriptionPreapprovals", preapprovalId),
    {
      id: preapprovalId,
      userId,
      planType,
      status,
      externalReference: preapproval.external_reference || null,
      nextPaymentDate: preapproval.next_payment_date || null,
      updatedAt: new Date(),
    },
    { merge: true }
  )

  if (status === "authorized") {
    await activateUserSubscription({
      userId,
      planType,
      preapprovalId,
      preapprovalStatus: status,
      nextPaymentDate: preapproval.next_payment_date || null,
      paymentDate: preapproval.summarized?.last_charged_date || new Date(),
      amount: preapproval.auto_recurring?.transaction_amount ?? null,
      paymentStatusRaw: "authorized",
    })
    return { userId, status, action: "activated" as const }
  }

  if (status === "paused" || status === "cancelled") {
    const userSnap = await getDoc(doc(db, "users", userId))
    const userData = userSnap.exists() ? (userSnap.data() as any) : {}
    const endsAt = normalizeSubscriptionDate(userData?.subscription?.endDate)
    const now = new Date()
    const hasRemainingAccess = Boolean(endsAt && endsAt.getTime() > now.getTime())

    if (hasRemainingAccess) {
      await setDoc(
        doc(db, "users", userId),
        {
          subscription_status: "active",
          isSubscribed: true,
          subscription: {
            ...(userData.subscription || {}),
            status: "active",
            autoRenew: false,
            cancelAtPeriodEnd: true,
            preapprovalId,
            preapprovalStatus: status,
            cancelledAt: now,
            deactivationReason: status,
          },
          updatedAt: now,
        },
        { merge: true }
      )
      return { userId, status, action: "cancel_at_period_end" as const }
    }

    await deactivateUserSubscription({
      userId,
      reason: status,
      preapprovalId,
      preapprovalStatus: status,
    })
    return { userId, status, action: "deactivated" as const }
  }

  return { userId, status, action: "ignored" as const }
}

export async function syncSubscriptionFromAuthorizedPayment(authorizedPayment: any) {
  const preapprovalId = authorizedPayment?.preapproval_id || authorizedPayment?.preapprovalId || null
  const externalReference = String(authorizedPayment?.external_reference || "")
  const parsed = parseSubscriptionExternalReference(externalReference)

  let userId = parsed?.userId || null
  let planType = parsed?.planType || "basic"

  if (!userId && preapprovalId) {
    const stored = await getDoc(doc(db, "subscriptionPreapprovals", String(preapprovalId)))
    if (stored.exists()) {
      const data = stored.data() as any
      userId = data.userId || null
      planType = data.planType || planType
    }
  }

  if (!userId && preapprovalId) {
    const preapproval = await fetchMercadoPagoPreapproval(String(preapprovalId))
    const fromPreapproval = parseSubscriptionExternalReference(String(preapproval.external_reference || ""))
    userId = fromPreapproval?.userId || null
    planType = fromPreapproval?.planType || planType
  }

  if (!userId) {
    throw new Error("No se pudo resolver el usuario del cobro de suscripción")
  }

  const paymentStatus = String(
    authorizedPayment?.payment?.status ||
      authorizedPayment?.status ||
      authorizedPayment?.payment_status ||
      ""
  ).toLowerCase()

  const paymentId =
    authorizedPayment?.payment?.id ||
    authorizedPayment?.payment_id ||
    authorizedPayment?.id ||
    null

  if (paymentStatus === "approved" || paymentStatus === "authorized") {
    let nextPaymentDate: string | null = null
    if (preapprovalId) {
      try {
        const preapproval = await fetchMercadoPagoPreapproval(String(preapprovalId))
        nextPaymentDate = preapproval.next_payment_date || null
      } catch {
        nextPaymentDate = null
      }
    }

    await activateUserSubscription({
      userId,
      planType,
      paymentId,
      preapprovalId: preapprovalId ? String(preapprovalId) : null,
      preapprovalStatus: "authorized",
      amount: Number(authorizedPayment?.transaction_amount ?? authorizedPayment?.payment?.transaction_amount ?? null),
      paymentStatusRaw: paymentStatus,
      nextPaymentDate,
      paymentDate: authorizedPayment?.last_modified || authorizedPayment?.date_created || new Date(),
    })

    return { userId, status: paymentStatus, action: "renewed" as const }
  }

  if (paymentStatus === "rejected" || paymentStatus === "cancelled" || paymentStatus === "refunded") {
    // No desactivamos de inmediato ante un rechazo aislado: MP reintenta.
    // Si el preapproval pasa a paused/cancelled, el webhook de preapproval sí desactiva.
    return { userId, status: paymentStatus, action: "payment_failed" as const }
  }

  return { userId, status: paymentStatus || "unknown", action: "ignored" as const }
}

/** Compat: pagos one-shot viejos con external_reference subscription_* */
export async function handleLegacySubscriptionPayment(externalReference: string, paymentInfo: any) {
  const parsed = parseSubscriptionExternalReference(externalReference)
  if (!parsed?.userId) {
    throw new Error("Referencia de suscripción inválida")
  }

  if (String(paymentInfo.status).toLowerCase() !== "approved") {
    return { userId: parsed.userId, action: "ignored" as const }
  }

  await activateUserSubscription({
    userId: parsed.userId,
    planType: parsed.planType,
    paymentId: paymentInfo.id,
    amount: paymentInfo.transaction_amount,
    paymentStatusRaw: paymentInfo.status,
    paymentDate: new Date(),
    // legacy: +30 días aproximados
    nextPaymentDate: new Date(Date.now() + 30 * MS_PER_DAY).toISOString(),
  })

  return { userId: parsed.userId, action: "activated_legacy" as const }
}
