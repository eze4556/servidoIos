import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import { createNotificationAdmin, type ServerNotificationInput } from "@/lib/notifications-server"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"

type IncomingNotification = ServerNotificationInput & {
  meta?: Record<string, unknown> | null
}

const cleanId = (value: unknown) => String(value || "").trim()

async function canNotifyUser(
  actorUid: string,
  actorIsAdmin: boolean,
  notification: IncomingNotification
): Promise<boolean> {
  const targetUserId = String(notification.userId || "").trim()
  if (!targetUserId) return false
  if (targetUserId === actorUid || actorIsAdmin) return true

  const appointmentId = notification.meta?.appointmentId
  if (typeof appointmentId === "string" && appointmentId.trim()) {
    const snap = await db.collection("serviceAppointments").doc(appointmentId.trim()).get()
    if (!snap.exists) return false
    const data = snap.data() || {}
    return data.buyerId === actorUid || data.sellerId === actorUid
  }

  const claimId = notification.meta?.claimId
  if (typeof claimId === "string" && claimId.trim()) {
    const snap = await db.collection("claims").doc(claimId.trim()).get()
    if (!snap.exists) return false
    const data = snap.data() || {}
    const isParty = data.buyerId === actorUid || data.sellerId === actorUid
    const isTargetParty = data.buyerId === targetUserId || data.sellerId === targetUserId
    return isParty && isTargetParty
  }

  const chatId = notification.meta?.chatId
  if (typeof chatId === "string" && chatId.trim()) {
    const snap = await db.collection("chats").doc(chatId.trim()).get()
    if (!snap.exists) return false
    const data = snap.data() || {}
    const participants = Array.isArray(data.participantIds)
      ? data.participantIds.map(cleanId).filter(Boolean)
      : [data.buyerId, data.sellerId].map(cleanId).filter(Boolean)
    const parties = new Set(participants)
    return parties.has(actorUid) && parties.has(targetUserId)
  }

  const orderId = notification.meta?.orderId
  if (typeof orderId === "string" && orderId.trim()) {
    const snap = await db.collection("foodOrders").doc(orderId.trim()).get()
    if (!snap.exists) return false
    const data = snap.data() || {}
    let restaurantOwnerId = String(data.restaurantOwnerId || "").trim()
    if (!restaurantOwnerId && data.restaurantId) {
      const restaurant = await db.collection("restaurants").doc(String(data.restaurantId)).get()
      restaurantOwnerId = String(restaurant.data()?.ownerId || "").trim()
    }
    const parties = new Set(
      [data.buyerId, restaurantOwnerId, data.cadeteId].map(cleanId).filter(Boolean)
    )
    return parties.has(actorUid) && parties.has(targetUserId)
  }

  const purchaseId = notification.meta?.purchaseId
  if (typeof purchaseId === "string" && purchaseId.trim()) {
    const id = purchaseId.trim()
    const purchase = await db.collection("purchases").doc(id).get()
    if (purchase.exists) {
      const data = purchase.data() || {}
      const parties = new Set([data.buyerId, data.sellerId].map(cleanId).filter(Boolean))
      return parties.has(actorUid) && parties.has(targetUserId)
    }

    const centralized = await db.collection("centralizedPurchases").doc(id).get()
    if (!centralized.exists) return false
    const data = centralized.data() || {}
    const sellerIds = Array.isArray(data.items)
      ? data.items.map((item: { vendedorId?: unknown }) => String(item?.vendedorId || ""))
      : []
    const parties = new Set([String(data.compradorId || ""), ...sellerIds].filter(Boolean))
    return parties.has(actorUid) && parties.has(targetUserId)
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    const actorIsAdmin = await isFirestoreAdmin(decoded.uid)
    const body = await request.json().catch(() => null)
    const list = Array.isArray(body?.notifications)
      ? (body.notifications as IncomingNotification[])
      : body?.notification
        ? [body.notification as IncomingNotification]
        : []

    if (list.length === 0) {
      return NextResponse.json({ error: "Sin notificaciones" }, { status: 400 })
    }
    if (list.length > 20) {
      return NextResponse.json({ error: "Demasiadas notificaciones" }, { status: 400 })
    }

    const ids: string[] = []
    for (const item of list) {
      const allowed = await canNotifyUser(decoded.uid, actorIsAdmin, item)
      if (!allowed) {
        return NextResponse.json(
          { error: `No autorizado para notificar a ${item.userId || "?"}` },
          { status: 403 }
        )
      }
      const id = await createNotificationAdmin({
        userId: item.userId,
        type: item.type || "system",
        title: item.title,
        body: item.body,
        link: item.link,
        dedupeKey: item.dedupeKey,
        meta: item.meta || null,
      })
      ids.push(id)
    }

    return NextResponse.json({ ok: true, ids })
  } catch (error) {
    console.error("POST /api/notifications/create", error)
    const message = error instanceof Error ? error.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
