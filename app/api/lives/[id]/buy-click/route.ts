import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireBearerUid } from "@/lib/lives-auth"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/** Incrementa clics en “Comprar ahora” (espectadores autenticados). */
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await requireBearerUid(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    const body = await request.json().catch(() => ({}))
    const productId = String((body as { productId?: string })?.productId || "").trim()
    if (!productId) {
      return NextResponse.json({ error: "Falta productId" }, { status: 400 })
    }

    const ref = db.collection("lives").doc(liveId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Vivo no encontrado" }, { status: 404 })
    }

    const data = snap.data() || {}
    if (data.status !== "live") {
      return NextResponse.json({ error: "El vivo ya terminó" }, { status: 410 })
    }

    // El host no cuenta como clic de venta (elige productos, no compra).
    if (data.sellerId === auth.uid) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await ref.update({
      buyClickCount: FieldValue.increment(1),
      lastBuyClickAt: FieldValue.serverTimestamp(),
      lastBuyClickProductId: productId,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[lives/buy-click]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar clic" },
      { status: 500 }
    )
  }
}
