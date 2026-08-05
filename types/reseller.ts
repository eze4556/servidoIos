/** Comisión fija Servido por unidad vendida con link de revendedor (ARS). */
export const RESELLER_COMMISSION_ARS = 500

/** Unidades vendidas necesarias para habilitar un cobro. */
export const RESELLER_UNITS_PAYOUT_THRESHOLD = 25

export type ResellerPayoutInfo = {
  titular: string
  cbu?: string | null
  alias?: string | null
  banco?: string | null
  dni?: string | null
  updatedAt?: string
}

export type ResellerLink = {
  id: string
  code: string
  productId: string
  referrerUserId: string
  sellerId: string
  clickCount: number
  createdAt: unknown
  active: boolean
}

export type ResellerAttributionLine = {
  productId: string
  quantity: number
  referralCode: string
  referrerUserId: string
  sellerId: string
  commissionPerUnit: number
}

export type ResellerPayoutBatchStatus = "pending_payout" | "paid"

export type ResellerPayoutBatch = {
  id: string
  referrerUserId: string
  units: number
  amount: number
  status: ResellerPayoutBatchStatus
  purchaseIds: string[]
  payoutInfoSnapshot: ResellerPayoutInfo | null
  createdAt: unknown
  paidAt?: string | null
  paidByAdminId?: string | null
  adminNote?: string | null
}

export type ResellerStats = {
  referrerUserId: string
  unitsInCurrentCycle: number
  lifetimeUnits: number
  lifetimePaidAmount: number
  totalClicks: number
  updatedAt?: unknown
}
