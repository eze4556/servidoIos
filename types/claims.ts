export const CLAIM_REASONS = [
  "not_received",
  "damaged",
  "wrong_item",
  "incomplete",
  "seller_no_response",
  "cancel_purchase",
  "other",
] as const

export type ClaimReason = (typeof CLAIM_REASONS)[number]

export const CLAIM_STATUSES = [
  "open",
  "waiting_seller",
  "seller_responded",
  "waiting_buyer",
  "agreement_proposed",
  "agreement_accepted",
  "in_review",
  "partial_refund_requested",
  "total_refund_requested",
  "refund_processing",
  "refund_approved",
  "refund_rejected",
  "rejected",
  "closed",
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export const CLAIM_OPEN_STATUSES: ClaimStatus[] = [
  "open",
  "waiting_seller",
  "seller_responded",
  "waiting_buyer",
  "agreement_proposed",
  "agreement_accepted",
  "in_review",
  "partial_refund_requested",
  "total_refund_requested",
  "refund_processing",
  "refund_rejected",
]

export const SELLER_RESPONSE_HOURS = 72
/** Horas restantes para enviar recordatorio al vendedor (sobre el plazo de 72 h). */
export const SLA_WARNING_HOURS_LEFT = 24

export const CLAIM_PROPOSAL_TYPES = [
  "reship",
  "partial_refund",
  "total_refund",
  "alternative",
] as const

export type ClaimProposalType = (typeof CLAIM_PROPOSAL_TYPES)[number]
export type ClaimProposalStatus = "pending" | "accepted" | "rejected"

export type ClaimActorRole = "buyer" | "seller" | "admin" | "system"

export type ClaimAttachment = {
  url: string
  path: string
  name: string
  contentType: string
  size: number
}

export type ClaimDoc = {
  id: string
  purchaseId: string
  productId: string
  purchaseKey: string
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
  status: ClaimStatus
  proposalType?: ClaimProposalType | null
  proposalAmount?: number | null
  proposalTracking?: string
  proposalNote?: string
  proposalStatus?: ClaimProposalStatus | null
  priority?: boolean
  refundId?: string | null
  refundAmount?: number | null
  refundRequestedAmount?: number | null
  refundStatus?: string | null
  mpConnectionError?: string | null
  mpConnectionStatus?: string | null
  refundedAt?: unknown
  slaWarningSentAt?: unknown
  slaEscalatedAt?: unknown
  sellerRespondBy: unknown
  lastMessageAt?: unknown
  lastMessagePreview?: string
  createdAt?: unknown
  updatedAt?: unknown
  closedAt?: unknown
  closedBy?: string | null
}

export type ClaimMessage = {
  id: string
  authorId: string
  authorRole: ClaimActorRole
  authorName: string
  body: string
  attachments: ClaimAttachment[]
  createdAt?: unknown
}

export type ClaimEvent = {
  id: string
  type: string
  actorId: string
  actorRole: ClaimActorRole
  actorName: string
  fromStatus?: ClaimStatus | null
  toStatus?: ClaimStatus | null
  note?: string
  createdAt?: unknown
}

export function isClaimOpen(status: ClaimStatus) {
  return CLAIM_OPEN_STATUSES.includes(status)
}

export function purchaseClaimKey(purchaseId: string, productId: string) {
  return `${purchaseId}_${productId}`
}
