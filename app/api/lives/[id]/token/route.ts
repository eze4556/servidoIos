import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireBearerUid } from "@/lib/lives-auth"
import {
  createLiveParticipantToken,
  getLiveKitUrl,
  isLiveKitConfigured,
} from "@/lib/livekit-server"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
  try {
    if (!isLiveKitConfigured()) {
      return NextResponse.json(
        { error: "LiveKit no está configurado en el servidor" },
        { status: 503 }
      )
    }

    const auth = await requireBearerUid(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    const snap = await db.collection("lives").doc(liveId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Vivo no encontrado" }, { status: 404 })
    }

    const data = snap.data() || {}
    if (data.status !== "live") {
      return NextResponse.json({ error: "Este vivo ya terminó" }, { status: 410 })
    }

    const roomName = String(data.roomName || liveId)
    const isHost = data.sellerId === auth.uid

    const userSnap = await db.collection("users").doc(auth.uid).get()
    const userData = userSnap.data() || {}
    const name = String(userData.name || userData.displayName || "Espectador")

    const token = await createLiveParticipantToken({
      roomName,
      identity: auth.uid,
      name,
      canPublish: isHost,
    })

    return NextResponse.json({
      token,
      serverUrl: getLiveKitUrl(),
      roomName,
      canPublish: isHost,
    })
  } catch (err) {
    console.error("[lives/token]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al generar token" },
      { status: 500 }
    )
  }
}
