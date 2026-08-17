import { FieldValue } from "firebase-admin/firestore"
import { db as adminDb } from "@/lib/firebase-admin"
import {
  RESELLER_COMMISSION_ARS,
  RESELLER_UNITS_PAYOUT_THRESHOLD,
  type ResellerAttributionLine,
  type ResellerPayoutInfo,
} from "@/types/reseller"
import type { ResellerNotificationIntent } from "@/lib/reseller/reseller-notifications"
import { batchReadyIntent } from "@/lib/reseller/reseller-notifications"

function applyUnitsToCycle(
  currentUnits: number,
  addUnits: number
): { remainder: number; completedBatches: number } {
  const total = currentUnits + addUnits
  const completedBatches = Math.floor(total / RESELLER_UNITS_PAYOUT_THRESHOLD)
  const remainder = total % RESELLER_UNITS_PAYOUT_THRESHOLD
  return { remainder, completedBatches }
}

export async function processResellerAttributionAfterPurchase(params: {
  purchaseId: string
  buyerId: string
  lines: ResellerAttributionLine[]
}): Promise<ResellerNotificationIntent[]> {
  const { purchaseId, buyerId, lines } = params
  if (!lines.length) return []

  const notificationIntents: ResellerNotificationIntent[] = []

  const byReferrer = new Map<string, { units: number; lines: ResellerAttributionLine[] }>()
  for (const line of lines) {
    const prev = byReferrer.get(line.referrerUserId) || { units: 0, lines: [] }
    prev.units += line.quantity
    prev.lines.push(line)
    byReferrer.set(line.referrerUserId, prev)
  }

  await adminDb.runTransaction(async (transaction) => {
    for (const [referrerUserId, bundle] of byReferrer.entries()) {
      const statsRef = adminDb.collection("resellerStats").doc(referrerUserId)
      const statsSnap = await transaction.get(statsRef)
      const prevStats = statsSnap.exists
        ? (statsSnap.data() as {
            unitsInCurrentCycle?: number
            lifetimeUnits?: number
            lifetimePaidAmount?: number
          })
        : {}

      const prevCycle = Number(prevStats.unitsInCurrentCycle || 0)
      const { remainder, completedBatches } = applyUnitsToCycle(prevCycle, bundle.units)

      const userRef = adminDb.collection("users").doc(referrerUserId)
      const userSnap = await transaction.get(userRef)
      const payoutInfo = (userSnap.data()?.resellerPayoutInfo || null) as ResellerPayoutInfo | null

      for (const line of bundle.lines) {
        const saleRef = adminDb.collection("resellerSales").doc()
        transaction.set(saleRef, {
          referrerUserId,
          sellerId: line.sellerId,
          productId: line.productId,
          purchaseId,
          buyerId,
          quantity: line.quantity,
          referralCode: line.referralCode,
          commissionPerUnit: line.commissionPerUnit,
          commissionTotal: line.quantity * line.commissionPerUnit,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      for (let i = 0; i < completedBatches; i++) {
        const batchRef = adminDb.collection("resellerPayoutBatches").doc()
        transaction.set(batchRef, {
          referrerUserId,
          units: RESELLER_UNITS_PAYOUT_THRESHOLD,
          amount: RESELLER_UNITS_PAYOUT_THRESHOLD * RESELLER_COMMISSION_ARS,
          status: "pending_payout",
          purchaseIds: [purchaseId],
          payoutInfoSnapshot: payoutInfo,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      const lifetimeUnits = Number(prevStats.lifetimeUnits || 0) + bundle.units

      transaction.set(
        statsRef,
        {
          referrerUserId,
          unitsInCurrentCycle: remainder,
          lifetimeUnits,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      const salesLeft = RESELLER_UNITS_PAYOUT_THRESHOLD - remainder
      if (salesLeft > 0 && salesLeft <= 3) {
        notificationIntents.push({
          kind: "almost_threshold",
          referrerUserId,
          salesLeft,
        })
      }

      for (let i = 0; i < completedBatches; i++) {
        notificationIntents.push(batchReadyIntent(referrerUserId, purchaseId, i))
      }
    }
  })

  return notificationIntents
}
