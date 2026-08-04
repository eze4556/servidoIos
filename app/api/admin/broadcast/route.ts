import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import { createNotificationAdmin } from "@/lib/notifications-server"
import { sendServidoBroadcastChatMessage } from "@/lib/servido-chat-server"

export type BroadcastAudience =
  | "all"
  | "buyers"
  | "sellers"
  | "restaurants"
  | "resellers"
  | "cadetes"
  | "city"
  | "country"

const ROLE_MAP: Record<string, string[]> = {
  buyers: ["user", "buyer"],
  sellers: ["seller"],
  resellers: ["seller"],
  cadetes: ["cadete"],
}

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    if (!(await isFirestoreAdmin(decoded.uid))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const title = String(body?.title || "").trim()
    const message = String(body?.body || body?.message || "").trim()
    const link = body?.link ? String(body.link).trim() : null
    const audience = String(body?.audience || "all") as BroadcastAudience
    const cityFilter = String(body?.city || "").trim().toLowerCase()
    const countryFilter = String(body?.country || "").trim().toLowerCase()
    const notificationType = String(body?.type || "promo")

    if (!title || !message) {
      return NextResponse.json({ error: "Título y mensaje son obligatorios" }, { status: 400 })
    }

    const usersSnap = await db.collection("users").get()
    const targetIds: string[] = []

    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data()
      const uid = docSnap.id
      const role = String(data.role || "user")

      if (audience === "all") {
        targetIds.push(uid)
        continue
      }

      if (audience === "city") {
        if (!cityFilter) continue
        const zone = String(data.zone || data.city || data.locationLabel || "").toLowerCase()
        if (zone.includes(cityFilter)) targetIds.push(uid)
        continue
      }

      if (audience === "country") {
        if (!countryFilter) continue
        const country = String(data.country || data.pais || "").toLowerCase()
        if (country.includes(countryFilter)) targetIds.push(uid)
        continue
      }

      if (audience === "restaurants") {
        if (role === "seller" && data.businessType === "restaurant") targetIds.push(uid)
        continue
      }

      const roles = ROLE_MAP[audience] || []
      if (roles.includes(role)) targetIds.push(uid)
    }

    const uniqueIds = [...new Set(targetIds)]
    const batchId = `broadcast_${Date.now()}`
    let sent = 0
    let chatMessages = 0

    for (const userId of uniqueIds) {
      await createNotificationAdmin({
        userId,
        type: notificationType,
        title,
        body: message,
        link,
        dedupeKey: `${batchId}_${userId}`,
        meta: { audience, batchId, city: cityFilter || null, fromServidoOfficial: true },
      })
      sent += 1

      try {
        await sendServidoBroadcastChatMessage({
          userId,
          title,
          body: message,
          link,
          batchId,
        })
        chatMessages += 1
      } catch (chatErr) {
        console.error("broadcast chat message failed", userId, chatErr)
      }

      if (sent >= 2000) break
    }

    return NextResponse.json({ ok: true, sent, chatMessages, audience, batchId })
  } catch (error) {
    console.error("POST /api/admin/broadcast", error)
    const msg = error instanceof Error ? error.message : "Error interno"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
