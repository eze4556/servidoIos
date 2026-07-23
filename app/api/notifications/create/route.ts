import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import { createNotificationAdmin, type ServerNotificationInput } from "@/lib/notifications-server"

type IncomingNotification = ServerNotificationInput & {
  meta?: Record<string, unknown> | null
}

async function canNotifyUser(actorUid: string, notification: IncomingNotification): Promise<boolean> {
  const targetUserId = String(notification.userId || "").trim()
  if (!targetUserId) return false
  if (targetUserId === actorUid) return true

  const appointmentId = notification.meta?.appointmentId
  if (typeof appointmentId === "string" && appointmentId.trim()) {
    const snap = await db.collection("serviceAppointments").doc(appointmentId.trim()).get()
    if (!snap.exists) return false
    const data = snap.data() || {}
    return data.buyerId === actorUid || data.sellerId === actorUid
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
      const allowed = await canNotifyUser(decoded.uid, item)
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
