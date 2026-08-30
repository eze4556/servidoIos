import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import { notifyFoodOrderAvailableToCadetes } from "@/lib/food-order-notifications-server"

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const actor = await adminAuth.verifyIdToken(authorization.slice(7).trim())
    const body = await request.json().catch(() => null)
    const orderId = String(body?.orderId || "").trim()
    if (!orderId) return NextResponse.json({ error: "Pedido faltante" }, { status: 400 })

    const order = await db.collection("foodOrders").doc(orderId).get()
    if (!order.exists) return NextResponse.json({ error: "Pedido inexistente" }, { status: 404 })
    const data = order.data() || {}

    let ownerId = String(data.restaurantOwnerId || "").trim()
    if (!ownerId && data.restaurantId) {
      const restaurant = await db.collection("restaurants").doc(String(data.restaurantId)).get()
      ownerId = String(restaurant.data()?.ownerId || "").trim()
    }
    if (actor.uid !== ownerId) {
      return NextResponse.json({ error: "No autorizado para este pedido" }, { status: 403 })
    }

    const notified = await notifyFoodOrderAvailableToCadetes(orderId)
    return NextResponse.json({ ok: true, notified })
  } catch (error) {
    console.error("POST /api/food-orders/notify-available", error)
    return NextResponse.json({ error: "No se pudo avisar a los cadetes" }, { status: 500 })
  }
}
