import { FieldValue } from "firebase-admin/firestore"
import { db as adminDb } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"
import { isClaimOpen } from "@/types/claims"
import type {
  ClaimSanctionRecord,
  ClaimSanctionType,
  SellerClaimHistory,
  SellerClaimHistoryStats,
  SellerModerationSnapshot,
} from "@/types/claim-moderation"

export class ClaimModerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number
  ) {
    super(message)
    this.name = "ClaimModerationError"
  }
}

function emptyStats(): SellerClaimHistoryStats {
  return {
    total: 0,
    open: 0,
    closedAgreement: 0,
    rejected: 0,
    refundsApproved: 0,
    refundsProcessing: 0,
    slaEscalated: 0,
    warnings: 0,
    suspensions: 0,
  }
}

function mapSanction(id: string, data: Record<string, unknown>): ClaimSanctionRecord {
  return {
    id,
    type: (data.type as ClaimSanctionRecord["type"]) || "warning",
    note: String(data.note || ""),
    claimId: typeof data.claimId === "string" ? data.claimId : null,
    actorId: String(data.actorId || ""),
    actorName: String(data.actorName || ""),
    productUploadLimit: data.productUploadLimit == null ? null : Number(data.productUploadLimit),
    createdAt: data.createdAt,
  }
}

function buildModerationSnapshot(userData: Record<string, unknown> | undefined): SellerModerationSnapshot {
  return {
    isActive: userData?.isActive !== false,
    sellerSalesBlocked: Boolean(userData?.sellerSalesBlocked),
    claimManualReview: Boolean(userData?.claimManualReview),
    productUploadLimit:
      userData?.productUploadLimit == null || userData?.productUploadLimit === undefined
        ? null
        : Number(userData.productUploadLimit),
    claimWarningCount: Number(userData?.claimWarningCount) || 0,
  }
}

function computeStats(claims: Array<Record<string, unknown>>, sanctions: ClaimSanctionRecord[]): SellerClaimHistoryStats {
  const stats = emptyStats()
  stats.total = claims.length
  stats.warnings = sanctions.filter((item) => item.type === "warning").length
  stats.suspensions = sanctions.filter((item) => item.type === "suspend").length

  for (const claim of claims) {
    const status = String(claim.status || "")
    if (isClaimOpen(status as never)) stats.open += 1
    if (status === "closed") stats.closedAgreement += 1
    if (status === "rejected" || status === "refund_rejected") stats.rejected += 1
    if (status === "refund_approved") stats.refundsApproved += 1
    if (status === "refund_processing") stats.refundsProcessing += 1
    if (claim.slaEscalatedAt) stats.slaEscalated += 1
  }

  return stats
}

export async function assertSellerCanReceiveSales(sellerId: string) {
  const sellerDoc = await adminDb.collection("users").doc(sellerId).get()
  if (!sellerDoc.exists) {
    throw new Error("El vendedor no está habilitado para recibir ventas")
  }
  const sellerData = sellerDoc.data() as Record<string, unknown>
  if (sellerData.isActive === false) {
    throw new Error("El vendedor no está habilitado para recibir ventas")
  }
  if (sellerData.sellerSalesBlocked === true) {
    throw new Error("Las ventas de este vendedor están temporalmente suspendidas por Servido")
  }
}

export async function getSellerClaimHistory(sellerId: string): Promise<SellerClaimHistory> {
  const trimmedSellerId = String(sellerId || "").trim()
  if (!trimmedSellerId) {
    throw new ClaimModerationError("Falta sellerId", "missing_seller", 400)
  }

  const [userSnap, claimsSnap, sanctionsSnap] = await Promise.all([
    adminDb.collection("users").doc(trimmedSellerId).get(),
    adminDb.collection("claims").where("sellerId", "==", trimmedSellerId).get(),
    adminDb
      .collection("users")
      .doc(trimmedSellerId)
      .collection("claimSanctions")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
  ])

  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : undefined
  const claims = claimsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) }))
  const sanctions = sanctionsSnap.docs.map((docSnap) => mapSanction(docSnap.id, docSnap.data() as Record<string, unknown>))

  const recentClaims = [...claims]
    .sort((a, b) => {
      const aTime = claimTimestamp(a.createdAt)
      const bTime = claimTimestamp(b.createdAt)
      return bTime - aTime
    })
    .slice(0, 8)
    .map((claim) => ({
      id: String(claim.id),
      productName: String(claim.productName || "Reclamo"),
      status: String(claim.status || ""),
      createdAt: claim.createdAt,
      slaEscalatedAt: claim.slaEscalatedAt,
    }))

  return {
    sellerId: trimmedSellerId,
    sellerName: String(userData?.name || userData?.displayName || "Vendedor"),
    stats: computeStats(claims, sanctions),
    moderation: buildModerationSnapshot(userData),
    sanctions,
    recentClaims,
  }
}

function claimTimestamp(value: unknown) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().getTime()
  }
  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
  }
  return 0
}

function sellerNotificationForSanction(type: ClaimSanctionType, note: string) {
  switch (type) {
    case "warning":
      return {
        title: "Servido registró una advertencia",
        body: note || "Tu cuenta tiene una advertencia por reclamos.",
      }
    case "limit_listings":
      return {
        title: "Servido limitó tus publicaciones",
        body: note || "Hay un límite nuevo en tu capacidad de publicar.",
      }
    case "block_sales":
      return {
        title: "Servido suspendió tus ventas temporalmente",
        body: note || "No podés recibir nuevas compras hasta que Servido revise tu cuenta.",
      }
    case "suspend":
      return {
        title: "Tu cuenta de vendedor fue suspendida",
        body: note || "Contactá a Servido para más información.",
      }
    case "manual_review":
      return {
        title: "Servido marcó tu cuenta para revisión",
        body: note || "Tu cuenta quedó en revisión manual por reclamos.",
      }
    case "clear_sales_block":
      return {
        title: "Servido reactivó tus ventas",
        body: note || "Ya podés volver a recibir compras.",
      }
    case "lift_manual_review":
      return {
        title: "Servido quitó la revisión manual",
        body: note || "Tu cuenta ya no está en revisión manual.",
      }
    case "restore_active":
      return {
        title: "Servido reactivó tu cuenta",
        body: note || "Tu cuenta volvió a estar activa.",
      }
    default:
      return { title: "Servido actualizó tu cuenta", body: note || "Revisá tu panel de vendedor." }
  }
}

export async function applySellerClaimSanction(params: {
  sellerId: string
  type: ClaimSanctionType
  note?: string
  claimId?: string
  productUploadLimit?: number
  adminId: string
  adminName: string
}) {
  const sellerId = String(params.sellerId || "").trim()
  if (!sellerId) {
    throw new ClaimModerationError("Falta sellerId", "missing_seller", 400)
  }

  const sellerRef = adminDb.collection("users").doc(sellerId)
  const sellerSnap = await sellerRef.get()
  if (!sellerSnap.exists) {
    throw new ClaimModerationError("Vendedor no encontrado", "not_found", 404)
  }

  const note = String(params.note || "").trim()
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

  switch (params.type) {
    case "warning":
      updates.claimWarningCount = FieldValue.increment(1)
      break
    case "limit_listings":
      if (params.productUploadLimit == null || Number.isNaN(Number(params.productUploadLimit))) {
        throw new ClaimModerationError("Indicá un límite de publicaciones", "invalid_limit", 400)
      }
      updates.productUploadLimit = Math.max(0, Math.floor(Number(params.productUploadLimit)))
      break
    case "block_sales":
      updates.sellerSalesBlocked = true
      break
    case "suspend":
      updates.isActive = false
      updates.sellerSalesBlocked = true
      break
    case "manual_review":
      updates.claimManualReview = true
      break
    case "clear_sales_block":
      updates.sellerSalesBlocked = false
      break
    case "lift_manual_review":
      updates.claimManualReview = false
      break
    case "restore_active":
      updates.isActive = true
      updates.sellerSalesBlocked = false
      break
    default:
      throw new ClaimModerationError("Tipo de sanción inválido", "invalid_type", 400)
  }

  await sellerRef.set(updates, { merge: true })

  const sanctionRef = await sellerRef.collection("claimSanctions").add({
    type: params.type,
    note,
    claimId: params.claimId || null,
    actorId: params.adminId,
    actorName: params.adminName,
    productUploadLimit: params.type === "limit_listings" ? updates.productUploadLimit : null,
    createdAt: FieldValue.serverTimestamp(),
  })

  if (params.claimId) {
    await adminDb.collection("claims").doc(params.claimId).collection("events").add({
      type: "seller_sanction",
      actorId: params.adminId,
      actorRole: "admin",
      actorName: params.adminName,
      note: `${params.type}${note ? `: ${note}` : ""}`,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  const notification = sellerNotificationForSanction(params.type, note)
  await createNotificationAdmin({
    userId: sellerId,
    type: "claim",
    title: notification.title,
    body: notification.body,
    link: "/dashboard/seller?tab=claims",
    dedupeKey: `claim_sanction_${sanctionRef.id}`,
    meta: { claimId: params.claimId || null, sanctionType: params.type },
  })

  return {
    ok: true as const,
    sanctionId: sanctionRef.id,
    history: await getSellerClaimHistory(sellerId),
  }
}
