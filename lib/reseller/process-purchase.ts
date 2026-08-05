import {
  collection,
  doc,
  type Firestore,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore"
import {
  RESELLER_COMMISSION_ARS,
  RESELLER_UNITS_PAYOUT_THRESHOLD,
  type ResellerAttributionLine,
  type ResellerPayoutInfo,
} from "@/types/reseller"

function applyUnitsToCycle(
  currentUnits: number,
  addUnits: number
): { remainder: number; completedBatches: number } {
  const total = currentUnits + addUnits
  const completedBatches = Math.floor(total / RESELLER_UNITS_PAYOUT_THRESHOLD)
  const remainder = total % RESELLER_UNITS_PAYOUT_THRESHOLD
  return { remainder, completedBatches }
}

export async function processResellerAttributionAfterPurchase(
  firestore: Firestore,
  params: {
    purchaseId: string
    buyerId: string
    lines: ResellerAttributionLine[]
  }
) {
  const { purchaseId, buyerId, lines } = params
  if (!lines.length) return

  const byReferrer = new Map<string, { units: number; lines: ResellerAttributionLine[] }>()
  for (const line of lines) {
    const prev = byReferrer.get(line.referrerUserId) || { units: 0, lines: [] }
    prev.units += line.quantity
    prev.lines.push(line)
    byReferrer.set(line.referrerUserId, prev)
  }

  await runTransaction(firestore, async (transaction) => {
    for (const [referrerUserId, bundle] of byReferrer.entries()) {
      const statsRef = doc(firestore, "resellerStats", referrerUserId)
      const statsSnap = await transaction.get(statsRef)
      const prevStats = statsSnap.exists()
        ? (statsSnap.data() as {
            unitsInCurrentCycle?: number
            lifetimeUnits?: number
            lifetimePaidAmount?: number
          })
        : {}

      const prevCycle = Number(prevStats.unitsInCurrentCycle || 0)
      const { remainder, completedBatches } = applyUnitsToCycle(prevCycle, bundle.units)

      const userRef = doc(firestore, "users", referrerUserId)
      const userSnap = await transaction.get(userRef)
      const payoutInfo = (userSnap.data()?.resellerPayoutInfo || null) as ResellerPayoutInfo | null

      for (const line of bundle.lines) {
        const saleRef = doc(collection(firestore, "resellerSales"))
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
          createdAt: serverTimestamp(),
        })
      }

      for (let i = 0; i < completedBatches; i++) {
        const batchRef = doc(collection(firestore, "resellerPayoutBatches"))
        transaction.set(batchRef, {
          referrerUserId,
          units: RESELLER_UNITS_PAYOUT_THRESHOLD,
          amount: RESELLER_UNITS_PAYOUT_THRESHOLD * RESELLER_COMMISSION_ARS,
          status: "pending_payout",
          purchaseIds: [purchaseId],
          payoutInfoSnapshot: payoutInfo,
          createdAt: serverTimestamp(),
        })
      }

      const lifetimeUnits = Number(prevStats.lifetimeUnits || 0) + bundle.units

      transaction.set(
        statsRef,
        {
          referrerUserId,
          unitsInCurrentCycle: remainder,
          lifetimeUnits,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }
  })
}
