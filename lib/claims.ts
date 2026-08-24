import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { dispatchAppNotifications } from "@/lib/notifications"
import { uploadClaimAttachments } from "@/lib/claim-storage"
import {
  isClaimOpen,
  purchaseClaimKey,
  SELLER_RESPONSE_HOURS,
  type ClaimActorRole,
  type ClaimAttachment,
  type ClaimDoc,
  type ClaimEvent,
  type ClaimMessage,
  type ClaimProposalType,
  type ClaimReason,
  type ClaimStatus,
} from "@/types/claims"

export type CreateClaimInput = {
  purchaseId: string
  productId: string
  paymentId: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  productName: string
  productImageUrl?: string | null
  amount: number
  reason: ClaimReason
  description: string
  receivedPartial: boolean
  proposedSolution: string
  files: File[]
}

function mapClaim(id: string, data: Record<string, unknown>): ClaimDoc {
  return {
    id,
    purchaseId: String(data.purchaseId || ""),
    productId: String(data.productId || ""),
    purchaseKey: String(data.purchaseKey || ""),
    paymentId: String(data.paymentId || ""),
    buyerId: String(data.buyerId || ""),
    sellerId: String(data.sellerId || ""),
    buyerName: String(data.buyerName || ""),
    sellerName: String(data.sellerName || ""),
    productName: String(data.productName || ""),
    productImageUrl: typeof data.productImageUrl === "string" ? data.productImageUrl : null,
    amount: Number(data.amount) || 0,
    reason: (data.reason as ClaimReason) || "other",
    description: String(data.description || ""),
    receivedPartial: Boolean(data.receivedPartial),
    proposedSolution: String(data.proposedSolution || ""),
    status: (data.status as ClaimStatus) || "waiting_seller",
    proposalType: (data.proposalType as ClaimDoc["proposalType"]) || null,
    proposalAmount: data.proposalAmount == null ? null : Number(data.proposalAmount) || 0,
    proposalTracking: typeof data.proposalTracking === "string" ? data.proposalTracking : "",
    proposalNote: typeof data.proposalNote === "string" ? data.proposalNote : "",
    proposalStatus: (data.proposalStatus as ClaimDoc["proposalStatus"]) || null,
    priority: Boolean(data.priority),
    refundId: typeof data.refundId === "string" ? data.refundId : null,
    refundAmount: data.refundAmount == null ? null : Number(data.refundAmount) || 0,
    refundRequestedAmount: data.refundRequestedAmount == null ? null : Number(data.refundRequestedAmount) || 0,
    refundStatus: typeof data.refundStatus === "string" ? data.refundStatus : null,
    mpConnectionError: typeof data.mpConnectionError === "string" ? data.mpConnectionError : null,
    mpConnectionStatus: typeof data.mpConnectionStatus === "string" ? data.mpConnectionStatus : null,
    refundedAt: data.refundedAt,
    slaWarningSentAt: data.slaWarningSentAt,
    slaEscalatedAt: data.slaEscalatedAt,
    sellerRespondBy: data.sellerRespondBy,
    lastMessageAt: data.lastMessageAt,
    lastMessagePreview: typeof data.lastMessagePreview === "string" ? data.lastMessagePreview : "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    closedAt: data.closedAt,
    closedBy: typeof data.closedBy === "string" ? data.closedBy : null,
  }
}

function mapMessage(id: string, data: Record<string, unknown>): ClaimMessage {
  return {
    id,
    authorId: String(data.authorId || ""),
    authorRole: (data.authorRole as ClaimActorRole) || "buyer",
    authorName: String(data.authorName || ""),
    body: String(data.body || ""),
    attachments: Array.isArray(data.attachments) ? (data.attachments as ClaimAttachment[]) : [],
    createdAt: data.createdAt,
  }
}

function mapEvent(id: string, data: Record<string, unknown>): ClaimEvent {
  return {
    id,
    type: String(data.type || ""),
    actorId: String(data.actorId || ""),
    actorRole: (data.actorRole as ClaimActorRole) || "system",
    actorName: String(data.actorName || ""),
    fromStatus: (data.fromStatus as ClaimStatus) || null,
    toStatus: (data.toStatus as ClaimStatus) || null,
    note: typeof data.note === "string" ? data.note : "",
    createdAt: data.createdAt,
  }
}

export function sortClaimsNewest(claims: ClaimDoc[]) {
  return [...claims].sort((a, b) => claimTime(b.createdAt) - claimTime(a.createdAt))
}

export function claimTime(value: unknown): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().getTime()
    } catch {
      return 0
    }
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return Number((value as { _seconds: number })._seconds) * 1000
  }
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function hoursLeftToRespond(claim: ClaimDoc) {
  const deadline = claimTime(claim.sellerRespondBy)
  if (!deadline) return null
  return (deadline - Date.now()) / (1000 * 60 * 60)
}

export async function findOpenClaimForPurchase(purchaseId: string, productId: string, buyerId: string) {
  const snap = await getDocs(
    query(
      collection(db, "claims"),
      where("buyerId", "==", buyerId),
      where("purchaseKey", "==", purchaseClaimKey(purchaseId, productId)),
      limit(20)
    )
  )
  return snap.docs
    .map((item) => mapClaim(item.id, item.data() as Record<string, unknown>))
    .find((claim) => isClaimOpen(claim.status))
}

export async function listClaimsForUser(role: "buyer" | "seller", userId: string) {
  const field = role === "buyer" ? "buyerId" : "sellerId"
  const snap = await getDocs(query(collection(db, "claims"), where(field, "==", userId)))
  return sortClaimsNewest(snap.docs.map((item) => mapClaim(item.id, item.data() as Record<string, unknown>)))
}

export async function getClaim(claimId: string) {
  const snap = await getDoc(doc(db, "claims", claimId))
  if (!snap.exists()) return null
  return mapClaim(snap.id, snap.data() as Record<string, unknown>)
}

export function subscribeClaim(claimId: string, onChange: (claim: ClaimDoc | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "claims", claimId), (snap) => {
    onChange(snap.exists() ? mapClaim(snap.id, snap.data() as Record<string, unknown>) : null)
  })
}

export function subscribeClaimMessages(claimId: string, onChange: (messages: ClaimMessage[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "claims", claimId, "messages"), orderBy("createdAt", "asc")), (snap) => {
    onChange(snap.docs.map((item) => mapMessage(item.id, item.data() as Record<string, unknown>)))
  })
}

export function subscribeClaimEvents(claimId: string, onChange: (events: ClaimEvent[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "claims", claimId, "events"), orderBy("createdAt", "asc")), (snap) => {
    onChange(snap.docs.map((item) => mapEvent(item.id, item.data() as Record<string, unknown>)))
  })
}

async function addClaimEvent(params: {
  claimId: string
  type: string
  actorId: string
  actorRole: ClaimActorRole
  actorName: string
  fromStatus?: ClaimStatus | null
  toStatus?: ClaimStatus | null
  note?: string
}) {
  await addDoc(collection(db, "claims", params.claimId, "events"), {
    type: params.type,
    actorId: params.actorId,
    actorRole: params.actorRole,
    actorName: params.actorName,
    fromStatus: params.fromStatus || null,
    toStatus: params.toStatus || null,
    note: params.note || "",
    createdAt: serverTimestamp(),
  })
}

export async function createClaim(input: CreateClaimInput) {
  const description = input.description.trim()
  if (!description) throw new Error("claim:empty_description")
  if (!input.reason) throw new Error("claim:empty_reason")
  if (input.buyerId === input.sellerId) throw new Error("claim:same_user")

  const existing = await findOpenClaimForPurchase(input.purchaseId, input.productId, input.buyerId)
  if (existing) return existing

  const respondBy = Timestamp.fromMillis(Date.now() + SELLER_RESPONSE_HOURS * 60 * 60 * 1000)
  const purchaseKey = purchaseClaimKey(input.purchaseId, input.productId)

  const ref = await addDoc(collection(db, "claims"), {
    purchaseId: input.purchaseId,
    productId: input.productId,
    purchaseKey,
    paymentId: input.paymentId || "",
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    buyerName: input.buyerName,
    sellerName: input.sellerName,
    productName: input.productName,
    productImageUrl: input.productImageUrl || null,
    amount: input.amount,
    reason: input.reason,
    description,
    receivedPartial: input.receivedPartial,
    proposedSolution: input.proposedSolution.trim(),
    status: "waiting_seller" satisfies ClaimStatus,
    sellerRespondBy: respondBy,
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: description.slice(0, 140),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    closedAt: null,
    closedBy: null,
  })

  const attachments = input.files.length > 0 ? await uploadClaimAttachments(ref.id, input.files) : []

  await addDoc(collection(db, "claims", ref.id, "messages"), {
    authorId: input.buyerId,
    authorRole: "buyer",
    authorName: input.buyerName,
    body: description,
    attachments,
    createdAt: serverTimestamp(),
  })

  await addClaimEvent({
    claimId: ref.id,
    type: "opened",
    actorId: input.buyerId,
    actorRole: "buyer",
    actorName: input.buyerName,
    toStatus: "waiting_seller",
    note: input.reason,
  })

  void dispatchAppNotifications([
    {
      userId: input.sellerId,
      type: "claim",
      title: "Nuevo reclamo en Servido",
      body: `${input.buyerName} abrió un reclamo por ${input.productName}.`,
      link: `/dashboard/claims/${ref.id}`,
      dedupeKey: `claim_opened_${ref.id}`,
      meta: { claimId: ref.id, purchaseId: input.purchaseId },
    },
  ])

  return (await getClaim(ref.id)) as ClaimDoc
}

export async function addClaimMessage(params: {
  claim: ClaimDoc
  authorId: string
  authorRole: "buyer" | "seller"
  authorName: string
  body: string
  files?: File[]
}) {
  if (!isClaimOpen(params.claim.status)) throw new Error("claim:closed")
  const body = params.body.trim()
  const files = params.files || []
  if (!body && files.length === 0) throw new Error("claim:empty_message")

  const isBuyer = params.authorRole === "buyer"
  if (isBuyer && params.authorId !== params.claim.buyerId) throw new Error("claim:forbidden")
  if (!isBuyer && params.authorId !== params.claim.sellerId) throw new Error("claim:forbidden")

  const attachments = files.length > 0 ? await uploadClaimAttachments(params.claim.id, files) : []
  const nextStatus: ClaimStatus =
    params.claim.status === "agreement_proposed" ||
    params.claim.status === "agreement_accepted" ||
    params.claim.status === "partial_refund_requested" ||
    params.claim.status === "total_refund_requested"
      ? params.claim.status
      : isBuyer
        ? "waiting_seller"
        : "seller_responded"

  await addDoc(collection(db, "claims", params.claim.id, "messages"), {
    authorId: params.authorId,
    authorRole: params.authorRole,
    authorName: params.authorName,
    body,
    attachments,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, "claims", params.claim.id), {
    status: nextStatus,
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: (body || files[0]?.name || "").slice(0, 140),
    updatedAt: serverTimestamp(),
  })

  if (params.claim.status !== nextStatus) {
    await addClaimEvent({
      claimId: params.claim.id,
      type: "message",
      actorId: params.authorId,
      actorRole: params.authorRole,
      actorName: params.authorName,
      fromStatus: params.claim.status,
      toStatus: nextStatus,
    })
  }

  const otherId = isBuyer ? params.claim.sellerId : params.claim.buyerId
  void dispatchAppNotifications([
    {
      userId: otherId,
      type: "claim",
      title: isBuyer ? "El comprador respondió el reclamo" : "El vendedor respondió el reclamo",
      body: body.slice(0, 140) || params.claim.productName,
      link: `/dashboard/claims/${params.claim.id}`,
      meta: { claimId: params.claim.id },
    },
  ])
}

function statusAfterAcceptedProposal(type: ClaimProposalType): ClaimStatus {
  if (type === "partial_refund") return "partial_refund_requested"
  if (type === "total_refund") return "total_refund_requested"
  return "agreement_accepted"
}

export async function proposeClaimSolution(params: {
  claim: ClaimDoc
  sellerId: string
  sellerName: string
  type: ClaimProposalType
  note: string
  amount?: number
  trackingNumber?: string
  files?: File[]
}) {
  if (!isClaimOpen(params.claim.status)) throw new Error("claim:closed")
  if (params.sellerId !== params.claim.sellerId) throw new Error("claim:forbidden")
  if (params.claim.proposalStatus === "pending") throw new Error("claim:proposal_pending")

  const note = params.note.trim()
  if (!note) throw new Error("claim:empty_proposal")

  let amount: number | null = null
  if (params.type === "partial_refund") {
    amount = Number(params.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("claim:invalid_amount")
    if (amount >= params.claim.amount) throw new Error("claim:invalid_amount")
  }
  if (params.type === "total_refund") {
    amount = params.claim.amount
  }

  const trackingNumber = (params.trackingNumber || "").trim()
  if (params.type === "reship" && !trackingNumber) throw new Error("claim:empty_tracking")

  const files = params.files || []
  const attachments = files.length > 0 ? await uploadClaimAttachments(params.claim.id, files) : []

  await updateDoc(doc(db, "claims", params.claim.id), {
    status: "agreement_proposed" satisfies ClaimStatus,
    proposalType: params.type,
    proposalAmount: amount,
    proposalTracking: trackingNumber,
    proposalNote: note,
    proposalStatus: "pending",
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: note.slice(0, 140),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(db, "claims", params.claim.id, "messages"), {
    authorId: params.sellerId,
    authorRole: "seller",
    authorName: params.sellerName,
    body: note,
    attachments,
    createdAt: serverTimestamp(),
  })

  await addClaimEvent({
    claimId: params.claim.id,
    type: "proposal",
    actorId: params.sellerId,
    actorRole: "seller",
    actorName: params.sellerName,
    fromStatus: params.claim.status,
    toStatus: "agreement_proposed",
    note: params.type,
  })

  void dispatchAppNotifications([
    {
      userId: params.claim.buyerId,
      type: "claim",
      title: "El vendedor propuso una solución",
      body: note.slice(0, 140),
      link: `/dashboard/claims/${params.claim.id}`,
      meta: { claimId: params.claim.id },
    },
  ])
}

export async function respondToClaimProposal(params: {
  claim: ClaimDoc
  buyerId: string
  buyerName: string
  accept: boolean
}) {
  if (params.buyerId !== params.claim.buyerId) throw new Error("claim:forbidden")
  if (params.claim.proposalStatus !== "pending" || params.claim.status !== "agreement_proposed") {
    throw new Error("claim:no_proposal")
  }

  const proposalType = params.claim.proposalType
  if (!proposalType) throw new Error("claim:no_proposal")

  const nextStatus: ClaimStatus = params.accept
    ? statusAfterAcceptedProposal(proposalType)
    : "waiting_seller"

  await updateDoc(doc(db, "claims", params.claim.id), {
    status: nextStatus,
    proposalStatus: params.accept ? "accepted" : "rejected",
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: params.accept ? "Propuesta aceptada" : "Propuesta rechazada",
  })

  await addClaimEvent({
    claimId: params.claim.id,
    type: params.accept ? "proposal_accepted" : "proposal_rejected",
    actorId: params.buyerId,
    actorRole: "buyer",
    actorName: params.buyerName,
    fromStatus: params.claim.status,
    toStatus: nextStatus,
  })

  void dispatchAppNotifications([
    {
      userId: params.claim.sellerId,
      type: "claim",
      title: params.accept ? "El comprador aceptó la propuesta" : "El comprador rechazó la propuesta",
      body: params.claim.productName,
      link: `/dashboard/claims/${params.claim.id}`,
      meta: { claimId: params.claim.id },
    },
  ])
}

export async function closeClaim(params: {
  claim: ClaimDoc
  actorId: string
  actorRole: "buyer" | "seller"
  actorName: string
}) {
  if (!isClaimOpen(params.claim.status)) return
  const allowed =
    (params.actorRole === "buyer" && params.actorId === params.claim.buyerId) ||
    (params.actorRole === "seller" && params.actorId === params.claim.sellerId)
  if (!allowed) throw new Error("claim:forbidden")

  await updateDoc(doc(db, "claims", params.claim.id), {
    status: "closed" satisfies ClaimStatus,
    closedAt: serverTimestamp(),
    closedBy: params.actorId,
    updatedAt: serverTimestamp(),
  })

  await addClaimEvent({
    claimId: params.claim.id,
    type: "closed",
    actorId: params.actorId,
    actorRole: params.actorRole,
    actorName: params.actorName,
    fromStatus: params.claim.status,
    toStatus: "closed",
  })

  const otherId = params.actorRole === "buyer" ? params.claim.sellerId : params.claim.buyerId
  void dispatchAppNotifications([
    {
      userId: otherId,
      type: "claim",
      title: "Reclamo cerrado",
      body: `El caso de ${params.claim.productName} fue cerrado.`,
      link: `/dashboard/claims/${params.claim.id}`,
      meta: { claimId: params.claim.id },
    },
  ])
}

export type ClaimAdminNote = {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt?: unknown
}

export async function listAllClaims() {
  const snap = await getDocs(collection(db, "claims"))
  return sortClaimsNewest(snap.docs.map((item) => mapClaim(item.id, item.data() as Record<string, unknown>)))
}

export async function setClaimPriority(params: {
  claim: ClaimDoc
  priority: boolean
  actorId: string
  actorName: string
}) {
  await updateDoc(doc(db, "claims", params.claim.id), {
    priority: params.priority,
    updatedAt: serverTimestamp(),
  })
  await addClaimEvent({
    claimId: params.claim.id,
    type: params.priority ? "priority_on" : "priority_off",
    actorId: params.actorId,
    actorRole: "admin",
    actorName: params.actorName,
    fromStatus: params.claim.status,
    toStatus: params.claim.status,
  })
}

export async function addClaimAdminNote(params: {
  claimId: string
  authorId: string
  authorName: string
  body: string
}) {
  const body = params.body.trim()
  if (!body) throw new Error("claim:empty_message")
  await addDoc(collection(db, "claims", params.claimId, "adminNotes"), {
    authorId: params.authorId,
    authorName: params.authorName,
    body,
    createdAt: serverTimestamp(),
  })
}

export function subscribeClaimAdminNotes(
  claimId: string,
  onChange: (notes: ClaimAdminNote[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "claims", claimId, "adminNotes"), orderBy("createdAt", "asc")),
    (snap) => {
      onChange(
        snap.docs.map((item) => {
          const data = item.data() as Record<string, unknown>
          return {
            id: item.id,
            authorId: String(data.authorId || ""),
            authorName: String(data.authorName || ""),
            body: String(data.body || ""),
            createdAt: data.createdAt,
          }
        })
      )
    }
  )
}

export async function adminSetClaimStatus(params: {
  claim: ClaimDoc
  status: ClaimStatus
  actorId: string
  actorName: string
  note?: string
}) {
  const updates: Record<string, unknown> = {
    status: params.status,
    updatedAt: serverTimestamp(),
  }
  if (params.status === "closed" || params.status === "rejected") {
    updates.closedAt = serverTimestamp()
    updates.closedBy = params.actorId
  }
  await updateDoc(doc(db, "claims", params.claim.id), updates)
  await addClaimEvent({
    claimId: params.claim.id,
    type: "admin_decision",
    actorId: params.actorId,
    actorRole: "admin",
    actorName: params.actorName,
    fromStatus: params.claim.status,
    toStatus: params.status,
    note: params.note || params.status,
  })
  void dispatchAppNotifications([
    {
      userId: params.claim.buyerId,
      type: "claim",
      title: "Servido actualizó tu reclamo",
      body: params.claim.productName,
      link: `/dashboard/claims/${params.claim.id}`,
      meta: { claimId: params.claim.id },
    },
    {
      userId: params.claim.sellerId,
      type: "claim",
      title: "Servido actualizó un reclamo",
      body: params.claim.productName,
      link: `/dashboard/claims/${params.claim.id}`,
      meta: { claimId: params.claim.id },
    },
  ])
}
