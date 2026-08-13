import { FieldValue } from "firebase-admin/firestore"
import { db as adminDb } from "@/lib/firebase-admin"
import { getTuesdaySettlementWindow } from "@/lib/delivery-settlements"
import type { BankPayoutInfo } from "@/types/delivery-settlements"

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

export async function generateCadetePayoutBatches(adminId: string) {
  const { start, end } = getTuesdaySettlementWindow()
  const snap = await adminDb.collection("foodOrders").where("cadetePayoutStatus", "==", "accrued").get()

  const byCadete = new Map<
    string,
    { orderIds: string[]; amount: number; totalKm: number; cadeteName: string }
  >()

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    if (data.status !== "entregado") continue
    const cadeteId = String(data.cadeteId || "")
    if (!cadeteId) continue
    const amount = Number(data.servidoPayoutAmount ?? data.cadetePayAmount) || 0
    if (amount <= 0) continue
    const km = Number(data.distanceKm) || 0
    const prev = byCadete.get(cadeteId) || {
      orderIds: [],
      amount: 0,
      totalKm: 0,
      cadeteName: String(data.cadeteName || ""),
    }
    prev.orderIds.push(docSnap.id)
    prev.amount += amount
    prev.totalKm += km
    if (!prev.cadeteName && data.cadeteName) prev.cadeteName = String(data.cadeteName)
    byCadete.set(cadeteId, prev)
  }

  const created: { id: string; cadeteId: string; amount: number; orderCount: number }[] = []

  for (const [cadeteId, group] of byCadete.entries()) {
    const userSnap = await adminDb.collection("users").doc(cadeteId).get()
    const userData = userSnap.data() || {}
    const payoutInfo = (userData.cadetePayoutInfo || null) as BankPayoutInfo | null
    const cadeteName =
      group.cadeteName || String(userData.name || userData.displayName || userData.email || "")

    const batchRef = adminDb.collection("cadetePayoutBatches").doc()
    await batchRef.set({
      cadeteId,
      cadeteName,
      orderIds: group.orderIds,
      orderCount: group.orderIds.length,
      totalKm: roundMoney(group.totalKm),
      amount: roundMoney(group.amount),
      status: "pending_payout",
      payoutInfoSnapshot: payoutInfo,
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      generatedByAdminId: adminId,
      createdAt: FieldValue.serverTimestamp(),
    })

    const writer = adminDb.bulkWriter()
    for (const orderId of group.orderIds) {
      writer.update(adminDb.collection("foodOrders").doc(orderId), {
        cadetePayoutStatus: "batched",
        cadetePayoutBatchId: batchRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    await writer.close()

    created.push({
      id: batchRef.id,
      cadeteId,
      amount: roundMoney(group.amount),
      orderCount: group.orderIds.length,
    })
  }

  return { created, skippedEmpty: snap.empty }
}

export async function generateRestaurantCommissionBatches(adminId: string) {
  const { start, end } = getTuesdaySettlementWindow()
  const snap = await adminDb.collection("foodOrders").where("commissionStatus", "==", "pending").get()

  const byRestaurant = new Map<
    string,
    { orderIds: string[]; amount: number; restaurantName: string; ownerId: string | null }
  >()

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    if (data.paymentMethod !== "cash") continue
    const restaurantId = String(data.restaurantId || "")
    if (!restaurantId) continue
    const amount = Number(data.servidoCommission) || 0
    if (amount <= 0) continue
    const prev = byRestaurant.get(restaurantId) || {
      orderIds: [],
      amount: 0,
      restaurantName: String(data.restaurantName || ""),
      ownerId: data.restaurantOwnerId ? String(data.restaurantOwnerId) : null,
    }
    prev.orderIds.push(docSnap.id)
    prev.amount += amount
    if (!prev.restaurantName && data.restaurantName) prev.restaurantName = String(data.restaurantName)
    byRestaurant.set(restaurantId, prev)
  }

  const created: { id: string; restaurantId: string; amount: number; orderCount: number }[] = []

  for (const [restaurantId, group] of byRestaurant.entries()) {
    const restSnap = await adminDb.collection("restaurants").doc(restaurantId).get()
    const restData = restSnap.data() || {}
    const restaurantName = group.restaurantName || String(restData.name || restaurantId)
    const ownerId = group.ownerId || (restData.ownerId ? String(restData.ownerId) : null)

    const batchRef = adminDb.collection("restaurantCommissionBatches").doc()
    await batchRef.set({
      restaurantId,
      restaurantName,
      ownerId,
      orderIds: group.orderIds,
      orderCount: group.orderIds.length,
      amount: roundMoney(group.amount),
      status: "pending_collection",
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      generatedByAdminId: adminId,
      createdAt: FieldValue.serverTimestamp(),
    })

    const writer = adminDb.bulkWriter()
    for (const orderId of group.orderIds) {
      writer.update(adminDb.collection("foodOrders").doc(orderId), {
        commissionStatus: "batched",
        restaurantCommissionBatchId: batchRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    await writer.close()

    created.push({
      id: batchRef.id,
      restaurantId,
      amount: roundMoney(group.amount),
      orderCount: group.orderIds.length,
    })
  }

  return { created, skippedEmpty: snap.empty }
}

export async function markCadetePayoutPaid(batchId: string, adminId: string) {
  const ref = adminDb.collection("cadetePayoutBatches").doc(batchId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("NOT_FOUND")
  const data = snap.data() as { status?: string; orderIds?: string[] }
  if (data.status === "paid") return { already: true }

  await ref.update({
    status: "paid",
    paidAt: new Date().toISOString(),
    paidByAdminId: adminId,
  })

  const orderIds = Array.isArray(data.orderIds) ? data.orderIds : []
  const writer = adminDb.bulkWriter()
  for (const orderId of orderIds) {
    writer.update(adminDb.collection("foodOrders").doc(orderId), {
      cadetePayoutStatus: "paid",
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  await writer.close()
  return { already: false }
}

export async function markRestaurantCommissionPaid(batchId: string, adminId: string) {
  const ref = adminDb.collection("restaurantCommissionBatches").doc(batchId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("NOT_FOUND")
  const data = snap.data() as { status?: string; orderIds?: string[] }
  if (data.status === "paid") return { already: true }

  await ref.update({
    status: "paid",
    paidAt: new Date().toISOString(),
    paidByAdminId: adminId,
  })

  const orderIds = Array.isArray(data.orderIds) ? data.orderIds : []
  const writer = adminDb.bulkWriter()
  for (const orderId of orderIds) {
    writer.update(adminDb.collection("foodOrders").doc(orderId), {
      commissionStatus: "paid",
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  await writer.close()
  return { already: false }
}
