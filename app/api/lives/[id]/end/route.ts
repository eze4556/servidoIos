import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireLiveSeller } from "@/lib/lives-auth"
import { getRoomService, isLiveKitConfigured } from "@/lib/livekit-server"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await requireLiveSeller(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    if (!liveId) {
      return NextResponse.json({ error: "Falta id del vivo" }, { status: 400 })
    }

    const ref = db.collection("lives").doc(liveId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Vivo no encontrado" }, { status: 404 })
    }

    const data = snap.data() || {}
    if (data.sellerId !== auth.user.uid) {
      return NextResponse.json({ error: "No sos el host de este vivo" }, { status: 403 })
    }

    if (data.status === "ended") {
      return NextResponse.json({ ok: true, alreadyEnded: true })
    }

    await ref.update({
      status: "ended",
      endedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (isLiveKitConfigured()) {
      try {
        const roomName = String(data.roomName || liveId)
        await getRoomService().deleteRoom(roomName)
      } catch (err) {
        console.warn("[lives/end] deleteRoom", err)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[lives/end]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al finalizar" },
      { status: 500 }
    )
  }
}
