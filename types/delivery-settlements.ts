export type BankPayoutInfo = {
  titular: string
  cbu?: string | null
  alias?: string | null
  banco?: string | null
  dni?: string | null
  updatedAt?: string
}

export type CadetePayoutBatchStatus = "pending_payout" | "paid"
export type RestaurantCommissionBatchStatus = "pending_collection" | "paid"

export type CadetePayoutBatch = {
  id: string
  cadeteId: string
  cadeteName?: string
  orderIds: string[]
  orderCount: number
  totalKm: number
  amount: number
  status: CadetePayoutBatchStatus
  payoutInfoSnapshot: BankPayoutInfo | null
  weekStart?: string
  weekEnd?: string
  createdAt?: unknown
  paidAt?: string | null
  paidByAdminId?: string | null
}

export type RestaurantCommissionBatch = {
  id: string
  restaurantId: string
  restaurantName?: string
  ownerId?: string | null
  orderIds: string[]
  orderCount: number
  amount: number
  status: RestaurantCommissionBatchStatus
  weekStart?: string
  weekEnd?: string
  createdAt?: unknown
  paidAt?: string | null
  paidByAdminId?: string | null
}
