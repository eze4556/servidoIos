import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { db as adminDb } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"
import {
  SLA_WARNING_HOURS_LEFT,
  type ClaimStatus,
} from "@/types/claims"

const WAITING_SELLER_STATUSES: ClaimStatus[] = ["waiting_seller", "open"]

const MP_ALERT_STATUSES: ClaimStatus[] = [
  "partial_refund_requested",
  "total_refund_requested",
  "agreement_accepted",
  "refund_rejected",
  "in_review",
]

function parseDeadline(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value instanceof Timestamp) return value.toDate()
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function hoursLeft(deadline: Date, now: Date) {
  return (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
}

async function listAdminUserIds() {
  const snap = await adminDb.collection("users").where("role", "==", "admin").get()
  return snap.docs.map((docSnap) => docSnap.id)
}

async function writeClaimEvent(params: {
  claimId: string
  type: string
  fromStatus?: string | null
  toStatus?: string | null
  note?: string
}) {
  await adminDb.collection("claims").doc(params.claimId).collection("events").add({
    type: params.type,
    actorId: "system",
    actorRole: "system",
    actorName: "Servido",
    fromStatus: params.fromStatus || null,
    toStatus: params.toStatus || null,
    note: params.note || "",
    createdAt: FieldValue.serverTimestamp(),
  })
}

async function notifyAdmins(params: {
  adminIds: string[]
  title: string
  body: string
  claimId: string
  dedupeKey: string
}) {
  await Promise.all(
    params.adminIds.map((userId) =>
      createNotificationAdmin({
        userId,
        type: "claim",
        title: params.title,
        body: params.body,
        link: "/admin",
        dedupeKey: `${params.dedupeKey}_${userId}`,
        meta: { claimId: params.claimId },
      })
    )
  )
}

async function sendSellerWarning(params: {
  claimId: string
  sellerId: string
  buyerId: string
  productName: string
  status: string
  hoursRemaining: number
}) {
  const claimRef = adminDb.collection("claims").doc(params.claimId)
  await claimRef.set(
    {
      slaWarningSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  await writeClaimEvent({
    claimId: params.claimId,
    type: "sla_warning",
    fromStatus: params.status,
    toStatus: params.status,
    note: String(Math.ceil(params.hoursRemaining)),
  })
  await createNotificationAdmin({
    userId: params.sellerId,
    type: "claim",
    title: "Tu plazo de respuesta está por vencer",
    body: `Quedan pocas horas para responder el reclamo de ${params.productName}.`,
    link: `/dashboard/claims/${params.claimId}`,
    dedupeKey: `claim_sla_warn_${params.claimId}`,
    meta: { claimId: params.claimId },
  })
  await createNotificationAdmin({
    userId: params.buyerId,
    type: "claim",
    title: "El vendedor aún no respondió tu reclamo",
    body: `El plazo de ${params.productName} está por vencer. Servido puede intervenir pronto.`,
    link: `/dashboard/claims/${params.claimId}`,
    dedupeKey: `claim_sla_warn_buyer_${params.claimId}`,
    meta: { claimId: params.claimId },
  })
}

async function escalateClaim(params: {
  claimId: string
  sellerId: string
  buyerId: string
  productName: string
  status: string
  adminIds: string[]
}) {
  const claimRef = adminDb.collection("claims").doc(params.claimId)
  await claimRef.set(
    {
      status: "in_review" satisfies ClaimStatus,
      priority: true,
      slaEscalatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  await writeClaimEvent({
    claimId: params.claimId,
    type: "sla_escalated",
    fromStatus: params.status,
    toStatus: "in_review",
    note: "seller_no_response",
  })
  await Promise.all([
    createNotificationAdmin({
      userId: params.sellerId,
      type: "claim",
      title: "El plazo del reclamo venció",
      body: `Servido tomó el caso de ${params.productName} porque no hubo respuesta a tiempo.`,
      link: `/dashboard/claims/${params.claimId}`,
      dedupeKey: `claim_sla_esc_seller_${params.claimId}`,
      meta: { claimId: params.claimId },
    }),
    createNotificationAdmin({
      userId: params.buyerId,
      type: "claim",
      title: "Servido revisará tu reclamo",
      body: `El vendedor no respondió a tiempo sobre ${params.productName}. El caso pasó a revisión.`,
      link: `/dashboard/claims/${params.claimId}`,
      dedupeKey: `claim_sla_esc_buyer_${params.claimId}`,
      meta: { claimId: params.claimId },
    }),
    notifyAdmins({
      adminIds: params.adminIds,
      title: "Reclamo escalado por plazo vencido",
      body: `${params.productName} — el vendedor no respondió en 72 h.`,
      claimId: params.claimId,
      dedupeKey: `claim_sla_esc_admin_${params.claimId}`,
    }),
  ])
}

async function alertAdminsMpIssue(params: {
  claimId: string
  productName: string
  sellerName: string
  mpConnectionError: string
  adminIds: string[]
}) {
  const claimRef = adminDb.collection("claims").doc(params.claimId)
  await claimRef.set(
    {
      mpConnectionAlertSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  await writeClaimEvent({
    claimId: params.claimId,
    type: "mp_connection_alert",
    note: params.mpConnectionError,
  })
  await notifyAdmins({
    adminIds: params.adminIds,
    title: "Reclamo bloqueado: Mercado Pago del vendedor",
    body: `${params.productName} (${params.sellerName}): ${params.mpConnectionError}`,
    claimId: params.claimId,
    dedupeKey: `claim_mp_alert_${params.claimId}`,
  })
}

export async function processClaimSlaJobs(now = new Date()) {
  const adminIds = await listAdminUserIds()
  let warned = 0
  let escalated = 0
  let mpAlerts = 0
  let scannedWaiting = 0
  let scannedMp = 0

  const waitingSnap = await adminDb.collection("claims").where("status", "in", WAITING_SELLER_STATUSES).get()
  scannedWaiting = waitingSnap.size

  for (const docSnap of waitingSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>
    const deadline = parseDeadline(data.sellerRespondBy)
    if (!deadline) continue

    const left = hoursLeft(deadline, now)
    const status = String(data.status || "") as ClaimStatus
    const productName = String(data.productName || "Reclamo")
    const sellerId = String(data.sellerId || "")
    const buyerId = String(data.buyerId || "")
    if (!sellerId || !buyerId) continue

    if (left <= 0) {
      if (data.slaEscalatedAt) continue
      await escalateClaim({
        claimId: docSnap.id,
        sellerId,
        buyerId,
        productName,
        status,
        adminIds,
      })
      escalated += 1
      continue
    }

    if (left <= SLA_WARNING_HOURS_LEFT) {
      if (data.slaWarningSentAt) continue
      await sendSellerWarning({
        claimId: docSnap.id,
        sellerId,
        buyerId,
        productName,
        status,
        hoursRemaining: left,
      })
      warned += 1
    }
  }

  const mpStatusSnap = await adminDb.collection("claims").where("status", "in", MP_ALERT_STATUSES).get()
  scannedMp = mpStatusSnap.size

  for (const docSnap of mpStatusSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>
    const error = typeof data.mpConnectionError === "string" ? data.mpConnectionError.trim() : ""
    if (!error || data.mpConnectionAlertSentAt) continue
    await alertAdminsMpIssue({
      claimId: docSnap.id,
      productName: String(data.productName || "Reclamo"),
      sellerName: String(data.sellerName || "Vendedor"),
      mpConnectionError: error,
      adminIds,
    })
    mpAlerts += 1
  }

  return {
    ok: true as const,
    checkedAt: now.toISOString(),
    scannedWaiting,
    scannedMp,
    warned,
    escalated,
    mpAlerts,
    adminCount: adminIds.length,
  }
}
