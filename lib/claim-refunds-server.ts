import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore"
import { db as adminDb } from "@/lib/firebase-admin"
import { getMercadoPagoConnectionRecord, getMercadoPagoSellerAccessToken } from "@/lib/mercadopago-oauth"
import { createNotificationAdmin } from "@/lib/notifications-server"
import {
  isClaimOpen,
  type ClaimStatus,
} from "@/types/claims"
import type { MercadoPagoConnectionSnapshot } from "@/lib/mercadopago-connection"

const MP_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments"
const REFUNDABLE_STATUSES: ClaimStatus[] = [
  "open",
  "waiting_seller",
  "in_review",
  "partial_refund_requested",
  "total_refund_requested",
  "agreement_accepted",
  "refund_rejected",
  "seller_responded",
  "waiting_buyer",
  "agreement_proposed",
]

export class ClaimRefundError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number,
    public extra?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ClaimRefundError"
  }
}

export type ClaimRefundMode = "total" | "partial"

type PaymentSnapshot = {
  id: string
  status: string
  statusDetail: string
  transactionAmount: number
  refundedAmount: number
  remaining: number
  fullyRefunded: boolean
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function money(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? roundMoney(n) : 0
}

function connectionBlockReason(snapshot: MercadoPagoConnectionSnapshot | null | undefined) {
  if (!snapshot || snapshot.status === "not_connected" || !snapshot.connected) {
    return snapshot?.status === "token_expired" ? "mp_token_expired" : "mp_not_connected"
  }
  if (snapshot.tokenExpired || snapshot.status === "token_expired") return "mp_token_expired"
  return null
}

async function fetchMercadoPagoJson(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

function mapPaymentSnapshot(paymentInfo: any): PaymentSnapshot | null {
  const id = String(paymentInfo?.id || "").trim()
  if (!id) return null
  const transactionAmount = money(paymentInfo.transaction_amount)
  const refundedAmount = money(paymentInfo.transaction_amount_refunded)
  const status = String(paymentInfo.status || "").toLowerCase()
  const statusDetail = String(paymentInfo.status_detail || "").toLowerCase()
  const remaining = roundMoney(Math.max(0, transactionAmount - refundedAmount))
  const fullyRefunded =
    status === "refunded" || (transactionAmount > 0 && remaining <= 0.009)
  return {
    id,
    status,
    statusDetail,
    transactionAmount,
    refundedAmount,
    remaining,
    fullyRefunded,
  }
}

function paymentLooksRefunded(payment: PaymentSnapshot) {
  return (
    payment.fullyRefunded ||
    payment.refundedAmount > 0.009 ||
    payment.status === "refunded" ||
    payment.statusDetail.includes("refund")
  )
}

async function writeClaimEvent(params: {
  claimId: string
  type: string
  actorId: string
  actorRole: string
  actorName: string
  fromStatus?: string | null
  toStatus?: string | null
  note?: string
}) {
  await adminDb.collection("claims").doc(params.claimId).collection("events").add({
    type: params.type,
    actorId: params.actorId,
    actorRole: params.actorRole,
    actorName: params.actorName,
    fromStatus: params.fromStatus || null,
    toStatus: params.toStatus || null,
    note: params.note || "",
    createdAt: FieldValue.serverTimestamp(),
  })
}

async function notifyClaimParties(params: {
  buyerId: string
  sellerId: string
  claimId: string
  titleBuyer: string
  titleSeller: string
  body: string
  dedupeKey: string
}) {
  await Promise.all([
    createNotificationAdmin({
      userId: params.buyerId,
      type: "claim",
      title: params.titleBuyer,
      body: params.body,
      link: `/dashboard/claims/${params.claimId}`,
      dedupeKey: `${params.dedupeKey}_buyer`,
      meta: { claimId: params.claimId },
    }),
    createNotificationAdmin({
      userId: params.sellerId,
      type: "claim",
      title: params.titleSeller,
      body: params.body,
      link: `/dashboard/claims/${params.claimId}`,
      dedupeKey: `${params.dedupeKey}_seller`,
      meta: { claimId: params.claimId },
    }),
  ])
}

async function persistConnectionIssue(params: {
  claimId: string
  sellerId: string
  snapshot: MercadoPagoConnectionSnapshot | null
  message: string
}) {
  const status = params.snapshot?.status || "not_connected"
  await adminDb.collection("claims").doc(params.claimId).set(
    {
      mpConnectionError: params.message,
      mpConnectionStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  await writeClaimEvent({
    claimId: params.claimId,
    type: "mp_connection_blocked",
    actorId: "system",
    actorRole: "system",
    actorName: "Mercado Pago",
    note: params.message,
  })
}

async function findClaimsForPayment(paymentId: string, purchaseId: string) {
  const seen = new Map<string, QueryDocumentSnapshot>()
  const claimsRef = adminDb.collection("claims")

  if (paymentId) {
    const snap = await claimsRef.where("paymentId", "==", String(paymentId)).get()
    snap.docs.forEach((docSnap) => seen.set(docSnap.id, docSnap))
  }
  if (purchaseId) {
    const snap = await claimsRef.where("purchaseId", "==", purchaseId).get()
    snap.docs.forEach((docSnap) => seen.set(docSnap.id, docSnap))
  }

  return [...seen.values()]
}

async function syncPurchaseRefundFields(purchaseId: string, payment: PaymentSnapshot) {
  if (!purchaseId) return
  const payload: Record<string, unknown> = {
    transactionAmountRefunded: payment.refundedAmount,
    paymentStatusRaw: payment.status,
    paymentStatusDetail: payment.statusDetail,
    mercadoPagoPaymentId: payment.id,
    paymentId: payment.id,
    updatedAt: new Date(),
  }

  if (payment.fullyRefunded) {
    payload.status = "refunded"
    payload.estadoPago = "cancelado"
  }

  const centralizedRef = adminDb.collection("centralizedPurchases").doc(purchaseId)
  const legacyRef = adminDb.collection("purchases").doc(purchaseId)
  const [centralizedSnap, legacySnap] = await Promise.all([centralizedRef.get(), legacyRef.get()])

  const writes: Promise<unknown>[] = []
  if (centralizedSnap.exists) {
    const current = centralizedSnap.data() as any
    const items = Array.isArray(current.items)
      ? current.items.map((item: any) => ({
          ...item,
          ...(payment.fullyRefunded ? { estadoPagoVendedor: "cancelado" } : {}),
        }))
      : undefined
    writes.push(
      centralizedRef.set(
        {
          ...payload,
          ...(items ? { items } : {}),
          ...(payment.fullyRefunded
            ? { estadoEnvio: current.estadoEnvio === "cancelado" ? "cancelado" : current.estadoEnvio }
            : {}),
        },
        { merge: true }
      )
    )
  }
  if (legacySnap.exists) {
    writes.push(legacyRef.set(payload, { merge: true }))
  }
  await Promise.all(writes)
}

export async function applyPaymentRefundToClaims(params: {
  paymentInfo: any
  purchaseId?: string
}) {
  const payment = mapPaymentSnapshot(params.paymentInfo)
  if (!payment || !paymentLooksRefunded(payment)) return { updated: 0 }

  const purchaseId = String(params.purchaseId || params.paymentInfo?.external_reference || "")
  try {
    await syncPurchaseRefundFields(purchaseId, payment)
  } catch (error) {
    console.error("claim refund purchase sync failed:", error)
  }

  const docs = await findClaimsForPayment(payment.id, purchaseId)
  let updated = 0

  for (const docSnap of docs) {
    const data = docSnap.data() as Record<string, unknown>
    const currentStatus = String(data.status || "") as ClaimStatus
    if (currentStatus === "closed" || currentStatus === "rejected") continue

    const requested = money(data.refundRequestedAmount ?? data.proposalAmount ?? data.amount)
    const alreadyApproved =
      currentStatus === "refund_approved" && money(data.refundAmount) >= payment.refundedAmount - 0.009
    if (alreadyApproved) continue

    const expected =
      currentStatus === "partial_refund_requested" || Number(data.refundRequestedAmount) > 0
        ? requested
        : payment.transactionAmount
    const confirmed =
      payment.fullyRefunded || (expected > 0 && payment.refundedAmount + 0.009 >= expected)

    const nextStatus: ClaimStatus = confirmed
      ? "refund_approved"
      : currentStatus === "refund_processing"
        ? "refund_processing"
        : currentStatus
    if (nextStatus === currentStatus && currentStatus !== "refund_processing" && !confirmed) {
      continue
    }

    const updates: Record<string, unknown> = {
      refundAmount: payment.refundedAmount,
      refundStatus: payment.status,
      mpConnectionError: null,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (confirmed) {
      updates.status = "refund_approved"
      updates.closedAt = FieldValue.serverTimestamp()
      updates.closedBy = "system"
      updates.refundedAt = FieldValue.serverTimestamp()
    } else if (currentStatus !== "refund_processing" && currentStatus !== "refund_approved") {
      updates.status = "refund_processing"
    }

    await docSnap.ref.set(updates, { merge: true })
    if (confirmed && currentStatus !== "refund_approved") {
      await writeClaimEvent({
        claimId: docSnap.id,
        type: "refund_confirmed",
        actorId: "system",
        actorRole: "system",
        actorName: "Mercado Pago",
        fromStatus: currentStatus,
        toStatus: "refund_approved",
        note: String(payment.refundedAmount),
      })
      await notifyClaimParties({
        buyerId: String(data.buyerId || ""),
        sellerId: String(data.sellerId || ""),
        claimId: docSnap.id,
        titleBuyer: "Tu reembolso fue acreditado",
        titleSeller: "Se acreditó un reembolso del reclamo",
        body: String(data.productName || "Reclamo"),
        dedupeKey: `claim_refund_ok_${docSnap.id}_${payment.refundedAmount}`,
      })
    }
    updated += 1
  }

  return { updated }
}

export async function getClaimRefundPreview(claimId: string) {
  const claimSnap = await adminDb.collection("claims").doc(claimId).get()
  if (!claimSnap.exists) {
    throw new ClaimRefundError("Reclamo no encontrado", "not_found", 404)
  }
  const claim = claimSnap.data() as Record<string, unknown>
  const record = await getMercadoPagoConnectionRecord(String(claim.sellerId || ""))
  const snapshot = record?.snapshot || null
  let blockReason = connectionBlockReason(snapshot)
  const paymentId = String(claim.paymentId || "").trim()
  if (!paymentId) blockReason = "missing_payment"

  let payment: PaymentSnapshot | null = null
  if (!blockReason && paymentId) {
    try {
      const token = await getMercadoPagoSellerAccessToken(String(claim.sellerId))
      const { response, payload } = await fetchMercadoPagoJson(`${MP_PAYMENTS_URL}/${paymentId}`, token)
      if (!response.ok) {
        blockReason = response.status === 401 ? "mp_token_expired" : "mp_payment_lookup_failed"
      } else {
        payment = mapPaymentSnapshot(payload)
        if (payment && paymentLooksRefunded(payment)) {
          await applyPaymentRefundToClaims({
            paymentInfo: payload,
            purchaseId: String(claim.purchaseId || ""),
          })
        }
      }
    } catch {
      blockReason = "mp_token_expired"
    }
  }

  const status = String(claim.status || "") as ClaimStatus
  const remaining = payment?.remaining ?? money(claim.amount)
  const canExecute =
    !blockReason &&
    remaining > 0.009 &&
    REFUNDABLE_STATUSES.includes(status) &&
    isClaimOpen(status)

  return {
    claimId,
    paymentId,
    sellerId: String(claim.sellerId || ""),
    amount: money(claim.amount),
    proposalAmount: claim.proposalAmount == null ? null : money(claim.proposalAmount),
    refundRequestedAmount: claim.refundRequestedAmount == null ? null : money(claim.refundRequestedAmount),
    refundAmount: claim.refundAmount == null ? null : money(claim.refundAmount),
    status,
    connection: {
      status: snapshot?.status || "not_connected",
      connected: Boolean(snapshot?.connected),
      tokenExpired: Boolean(snapshot?.tokenExpired),
    },
    payment,
    canExecute,
    blockReason,
    mpConnectionError: typeof claim.mpConnectionError === "string" ? claim.mpConnectionError : null,
  }
}

export async function executeClaimRefund(params: {
  claimId: string
  mode: ClaimRefundMode
  amount?: number
  adminId: string
  adminName: string
}) {
  const claimRef = adminDb.collection("claims").doc(params.claimId)
  const claimSnap = await claimRef.get()
  if (!claimSnap.exists) {
    throw new ClaimRefundError("Reclamo no encontrado", "not_found", 404)
  }

  const claim = claimSnap.data() as Record<string, unknown>
  const status = String(claim.status || "") as ClaimStatus
  const paymentId = String(claim.paymentId || "").trim()
  const sellerId = String(claim.sellerId || "")

  if (!paymentId) {
    throw new ClaimRefundError("El reclamo no tiene payment_id de Mercado Pago", "missing_payment", 400)
  }
  if (status === "refund_approved") {
    throw new ClaimRefundError("Este reclamo ya tiene el reembolso acreditado", "already_refunded", 409)
  }
  if (status === "refund_processing") {
    throw new ClaimRefundError("Ya hay un reembolso en proceso para este reclamo", "already_processing", 409)
  }
  if (status === "closed" || status === "rejected" || !REFUNDABLE_STATUSES.includes(status)) {
    throw new ClaimRefundError("Este reclamo no admite un reembolso ahora", "forbidden_status", 409)
  }

  const record = await getMercadoPagoConnectionRecord(sellerId)
  const snapshot = record?.snapshot || null
  const connectionReason = connectionBlockReason(snapshot)
  if (connectionReason) {
    const message =
      connectionReason === "mp_token_expired"
        ? "La conexión de Mercado Pago del vendedor está vencida o revocada. El reembolso queda pendiente."
        : "El vendedor no tiene Mercado Pago conectado. El reembolso queda pendiente."
    await persistConnectionIssue({
      claimId: params.claimId,
      sellerId,
      snapshot,
      message,
    })
    throw new ClaimRefundError(message, connectionReason, 409, { connection: snapshot?.status })
  }

  let accessToken: string
  try {
    accessToken = await getMercadoPagoSellerAccessToken(sellerId)
  } catch {
    const message = "No se pudo usar la cuenta de Mercado Pago del vendedor. El reembolso queda pendiente."
    await persistConnectionIssue({
      claimId: params.claimId,
      sellerId,
      snapshot,
      message,
    })
    throw new ClaimRefundError(message, "mp_token_expired", 409)
  }

  const { response: paymentResponse, payload: paymentPayload } = await fetchMercadoPagoJson(
    `${MP_PAYMENTS_URL}/${paymentId}`,
    accessToken
  )
  if (!paymentResponse.ok) {
    const message =
      paymentResponse.status === 401
        ? "La conexión de Mercado Pago del vendedor está vencida o revocada. El reembolso queda pendiente."
        : "No se pudo consultar el pago original en Mercado Pago."
    if (paymentResponse.status === 401) {
      await persistConnectionIssue({ claimId: params.claimId, sellerId, snapshot, message })
    }
    throw new ClaimRefundError(message, paymentResponse.status === 401 ? "mp_token_expired" : "mp_payment_lookup_failed", 409)
  }

  const payment = mapPaymentSnapshot(paymentPayload)
  if (!payment) {
    throw new ClaimRefundError("Mercado Pago no devolvió el pago original", "mp_payment_lookup_failed", 502)
  }
  if (payment.fullyRefunded || payment.remaining <= 0.009) {
    await applyPaymentRefundToClaims({
      paymentInfo: paymentPayload,
      purchaseId: String(claim.purchaseId || ""),
    })
    throw new ClaimRefundError("El pago original ya está reembolsado en Mercado Pago", "already_refunded", 409)
  }

  const claimTotal = money(claim.amount)
  let refundAmount = params.mode === "total" ? payment.remaining : money(params.amount)
  if (params.mode === "partial") {
    if (refundAmount <= 0) {
      throw new ClaimRefundError("Indicá un importe parcial mayor a 0", "invalid_amount", 400)
    }
    if (refundAmount >= claimTotal) {
      throw new ClaimRefundError("El importe parcial tiene que ser menor al total de la compra", "invalid_amount", 400)
    }
  }
  if (refundAmount > payment.remaining + 0.009) {
    throw new ClaimRefundError("El importe supera lo que todavía se puede reembolsar en Mercado Pago", "invalid_amount", 400)
  }
  refundAmount = roundMoney(Math.min(refundAmount, payment.remaining))

  const body = params.mode === "total" && refundAmount >= payment.remaining - 0.009
    ? {}
    : { amount: refundAmount }
  const idempotencyKey = `servido-claim-${params.claimId}-${params.mode}-${Math.round(refundAmount * 100)}`

  const { response: refundResponse, payload: refundPayload } = await fetchMercadoPagoJson(
    `${MP_PAYMENTS_URL}/${paymentId}/refunds`,
    accessToken,
    {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    }
  )

  if (!refundResponse.ok) {
    const mpMessage = String(
      refundPayload?.message || refundPayload?.error || refundPayload?.cause?.[0]?.description || "Mercado Pago rechazó el reembolso"
    )
    const unauthorized = refundResponse.status === 401 || refundResponse.status === 403
    if (unauthorized) {
      const message = "La conexión de Mercado Pago del vendedor no permite reembolsar. El caso queda pendiente."
      await persistConnectionIssue({ claimId: params.claimId, sellerId, snapshot, message })
      throw new ClaimRefundError(message, "mp_token_expired", 409)
    }

    await claimRef.set(
      {
        status: "refund_rejected" satisfies ClaimStatus,
        refundStatus: "rejected",
        mpConnectionError: mpMessage,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    await writeClaimEvent({
      claimId: params.claimId,
      type: "refund_failed",
      actorId: params.adminId,
      actorRole: "admin",
      actorName: params.adminName,
      fromStatus: status,
      toStatus: "refund_rejected",
      note: mpMessage,
    })
    await notifyClaimParties({
      buyerId: String(claim.buyerId || ""),
      sellerId,
      claimId: params.claimId,
      titleBuyer: "El reembolso no se pudo completar",
      titleSeller: "Mercado Pago rechazó un reembolso",
      body: String(claim.productName || "Reclamo"),
      dedupeKey: `claim_refund_fail_${params.claimId}`,
    })
    throw new ClaimRefundError(mpMessage, "mp_refund_rejected", 409)
  }

  const refundId = String(refundPayload?.id || "")
  const mpRefundStatus = String(refundPayload?.status || "in_process").toLowerCase()
  const confirmedNow = mpRefundStatus === "approved"

  await claimRef.set(
    {
      status: (confirmedNow ? "refund_approved" : "refund_processing") satisfies ClaimStatus,
      refundId,
      refundAmount,
      refundRequestedAmount: refundAmount,
      refundStatus: mpRefundStatus,
      mpConnectionError: null,
      mpConnectionStatus: snapshot?.status || "connected",
      updatedAt: FieldValue.serverTimestamp(),
      ...(confirmedNow
        ? {
            closedAt: FieldValue.serverTimestamp(),
            closedBy: params.adminId,
            refundedAt: FieldValue.serverTimestamp(),
          }
        : {}),
    },
    { merge: true }
  )

  await writeClaimEvent({
    claimId: params.claimId,
    type: confirmedNow ? "refund_confirmed" : "refund_executed",
    actorId: params.adminId,
    actorRole: "admin",
    actorName: params.adminName,
    fromStatus: status,
    toStatus: confirmedNow ? "refund_approved" : "refund_processing",
    note: String(refundAmount),
  })

  await notifyClaimParties({
    buyerId: String(claim.buyerId || ""),
    sellerId,
    claimId: params.claimId,
    titleBuyer: confirmedNow ? "Tu reembolso fue acreditado" : "Servido inició tu reembolso",
    titleSeller: confirmedNow ? "Se acreditó un reembolso del reclamo" : "Servido inició un reembolso del reclamo",
    body: String(claim.productName || "Reclamo"),
    dedupeKey: `claim_refund_${confirmedNow ? "ok" : "proc"}_${params.claimId}_${refundId || refundAmount}`,
  })

  return {
    ok: true,
    refundId,
    amount: refundAmount,
    status: confirmedNow ? "refund_approved" : "refund_processing",
    mercadoPagoStatus: mpRefundStatus,
  }
}
