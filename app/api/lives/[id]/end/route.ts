import { NextRequest, NextResponse } from "next/server"
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireLiveSeller } from "@/lib/lives-auth"
import { getRoomService, isLiveKitConfigured } from "@/lib/livekit-server"
import type { LiveMetrics } from "@/types/live"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

function toMillis(value: unknown): number {
  if (!value) return Date.now()
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    try {
      return (value as Timestamp).toMillis()
    } catch {
      /* fallthrough */
    }
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return Number((value as { seconds: number }).seconds) * 1000
  }
  const n = new Date(value as string | number).getTime()
  return Number.isFinite(n) ? n : Date.now()
}

function emptyMetrics(): LiveMetrics {
  return {
    durationSeconds: 0,
    peakViewerCount: 0,
    chatMessageCount: 0,
    buyClickCount: 0,
    followersNotifiedCount: 0,
  }
}

async function buildMetrics(liveId: string, data: DocumentData): Promise<LiveMetrics> {
  const startedMs = toMillis(data.startedAt)
  const endedMs = data.endedAt ? toMillis(data.endedAt) : Date.now()
  const durationSeconds = Math.max(0, Math.floor((endedMs - startedMs) / 1000))

  let chatMessageCount = Math.max(0, Math.floor(Number(data.chatMessageCount) || 0))
  if (!chatMessageCount) {
    try {
      const agg = await db.collection("lives").doc(liveId).collection("messages").count().get()
      chatMessageCount = agg.data().count || 0
    } catch {
      /* keep 0 */
    }
  }

  return {
    durationSeconds,
    peakViewerCount: Math.max(
      0,
      Math.floor(Number(data.peakViewerCount) || Number(data.viewerCount) || 0)
    ),
    chatMessageCount,
    buyClickCount: Math.max(0, Math.floor(Number(data.buyClickCount) || 0)),
    followersNotifiedCount: Math.max(0, Math.floor(Number(data.followersNotifiedCount) || 0)),
  }
}

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
      const existing = data.metrics as LiveMetrics | undefined
      const metrics = existing?.durationSeconds != null ? existing : await buildMetrics(liveId, data)
      return NextResponse.json({ ok: true, alreadyEnded: true, metrics })
    }

    const metrics = await buildMetrics(liveId, {
      ...data,
      endedAt: Timestamp.now(),
    })

    await ref.update({
      status: "ended",
      endedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      chatMessageCount: metrics.chatMessageCount,
      metrics,
    })

    if (isLiveKitConfigured()) {
      try {
        const roomName = String(data.roomName || liveId)
        await getRoomService().deleteRoom(roomName)
      } catch (err) {
        console.warn("[lives/end] deleteRoom", err)
      }
    }

    return NextResponse.json({ ok: true, metrics })
  } catch (err) {
    console.error("[lives/end]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al finalizar" },
      { status: 500 }
    )
  }
}
