import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireBearerUid } from "@/lib/lives-auth"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/** Actualiza el contador de espectadores (solo el host). */
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await requireBearerUid(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    const body = await request.json().catch(() => ({}))
    const viewerCount = Math.max(0, Math.min(100_000, Math.floor(Number(body?.viewerCount) || 0)))

    const ref = db.collection("lives").doc(liveId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Vivo no encontrado" }, { status: 404 })
    }

    const data = snap.data() || {}
    if (data.sellerId !== auth.uid) {
      return NextResponse.json({ error: "Solo el host puede actualizar el contador" }, { status: 403 })
    }
    if (data.status !== "live") {
      return NextResponse.json({ error: "El vivo ya terminó" }, { status: 410 })
    }

    const prevPeak = Number(data.peakViewerCount) || 0
    const peakViewerCount = Math.max(prevPeak, viewerCount)

    await ref.update({
      viewerCount,
      peakViewerCount,
      viewerCountUpdatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ viewerCount, peakViewerCount })
  } catch (err) {
    console.error("[lives/viewers]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar espectadores" },
      { status: 500 }
    )
  }
}
