import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    if (!(await isFirestoreAdmin(decoded.uid))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const [accruedSnap, pendingCashSnap, cadetePendingSnap, restaurantPendingSnap] = await Promise.all([
      adminDb.collection("foodOrders").where("cadetePayoutStatus", "==", "accrued").get(),
      adminDb.collection("foodOrders").where("commissionStatus", "==", "pending").get(),
      adminDb.collection("cadetePayoutBatches").where("status", "==", "pending_payout").get(),
      adminDb.collection("restaurantCommissionBatches").where("status", "==", "pending_collection").get(),
    ])

    let accruedCadeteAmount = 0
    let accruedCadeteOrders = 0
    let accruedKm = 0
    for (const docSnap of accruedSnap.docs) {
      const data = docSnap.data()
      if (data.status !== "entregado") continue
      const amount = Number(data.servidoPayoutAmount ?? data.cadetePayAmount) || 0
      if (amount <= 0) continue
      accruedCadeteAmount += amount
      accruedCadeteOrders += 1
      accruedKm += Number(data.distanceKm) || 0
    }

    let pendingCashCommission = 0
    let pendingCashOrders = 0
    for (const docSnap of pendingCashSnap.docs) {
      const data = docSnap.data()
      if (data.paymentMethod !== "cash") continue
      const amount = Number(data.servidoCommission) || 0
      if (amount <= 0) continue
      pendingCashCommission += amount
      pendingCashOrders += 1
    }

    const cadeteToPay = cadetePendingSnap.docs.reduce(
      (sum, d) => sum + (Number(d.data().amount) || 0),
      0
    )
    const restaurantToCollect = restaurantPendingSnap.docs.reduce(
      (sum, d) => sum + (Number(d.data().amount) || 0),
      0
    )

    return NextResponse.json({
      accruedCadeteAmount: roundMoney(accruedCadeteAmount),
      accruedCadeteOrders,
      accruedKm: roundMoney(accruedKm),
      cadeteBatchesPending: cadetePendingSnap.size,
      cadeteToPay: roundMoney(cadeteToPay),
      pendingCashCommission: roundMoney(pendingCashCommission),
      pendingCashOrders,
      restaurantBatchesPending: restaurantPendingSnap.size,
      restaurantToCollect: roundMoney(restaurantToCollect),
    })
  } catch (error) {
    console.error("GET /api/admin/delivery-settlements/summary", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
