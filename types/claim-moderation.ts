export const CLAIM_SANCTION_TYPES = [
  "warning",
  "limit_listings",
  "block_sales",
  "suspend",
  "manual_review",
  "clear_sales_block",
  "lift_manual_review",
  "restore_active",
] as const

export type ClaimSanctionType = (typeof CLAIM_SANCTION_TYPES)[number]

export type ClaimSanctionRecord = {
  id: string
  type: ClaimSanctionType
  note: string
  claimId?: string | null
  actorId: string
  actorName: string
  productUploadLimit?: number | null
  createdAt?: unknown
}

export type SellerClaimHistoryStats = {
  total: number
  open: number
  closedAgreement: number
  rejected: number
  refundsApproved: number
  refundsProcessing: number
  slaEscalated: number
  warnings: number
  suspensions: number
}

export type SellerModerationSnapshot = {
  isActive: boolean
  sellerSalesBlocked: boolean
  claimManualReview: boolean
  productUploadLimit: number | null
  claimWarningCount: number
}

export type SellerClaimHistory = {
  sellerId: string
  sellerName: string
  stats: SellerClaimHistoryStats
  moderation: SellerModerationSnapshot
  sanctions: ClaimSanctionRecord[]
  recentClaims: Array<{
    id: string
    productName: string
    status: string
    createdAt?: unknown
    slaEscalatedAt?: unknown
  }>
}
