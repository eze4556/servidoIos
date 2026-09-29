import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireLiveSeller } from "@/lib/lives-auth"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

function firstImageUrl(data: Record<string, unknown>): string | null {
  if (typeof data.imageUrl === "string" && data.imageUrl) return data.imageUrl
  if (typeof data.thumbnailUrl === "string" && data.thumbnailUrl) return data.thumbnailUrl
  const media = data.media
  if (Array.isArray(media) && media.length > 0) {
    for (const item of media) {
      if (item && typeof item === "object" && "url" in item) {
        const url = String((item as { url?: string }).url || "")
        if (url) return url
      }
    }
  }
  const images = data.images
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0]
    if (typeof first === "string") return first
    if (first && typeof first === "object" && "url" in first) {
      return String((first as { url: string }).url || "") || null
    }
  }
  return null
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await requireLiveSeller(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    const body = await request.json().catch(() => ({}))
    const productIdRaw = body?.productId
    const productId =
      productIdRaw === null || productIdRaw === undefined || productIdRaw === ""
        ? null
        : String(productIdRaw).trim()

    const ref = db.collection("lives").doc(liveId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Vivo no encontrado" }, { status: 404 })
    }
    const live = snap.data() || {}
    if (live.sellerId !== auth.user.uid) {
      return NextResponse.json({ error: "No sos el host de este vivo" }, { status: 403 })
    }
    if (live.status !== "live") {
      return NextResponse.json({ error: "El vivo ya terminó" }, { status: 400 })
    }

    if (!productId) {
      await ref.update({
        pinnedProduct: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ pinnedProduct: null })
    }

    const productSnap = await db.collection("products").doc(productId).get()
    if (!productSnap.exists) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }
    const product = productSnap.data() || {}
    const ownerId = String(product.sellerId || product.userId || "")
    if (ownerId && ownerId !== auth.user.uid) {
      return NextResponse.json({ error: "Ese producto no es de tu tienda" }, { status: 403 })
    }

    const pinnedProduct = {
      productId,
      title: String(product.name || product.title || "Producto"),
      price: Number(product.price) || 0,
      imageUrl: firstImageUrl(product as Record<string, unknown>),
      currency: String(product.currency || "ARS"),
    }

    await ref.update({
      pinnedProduct,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ pinnedProduct })
  } catch (err) {
    console.error("[lives/pin]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al fijar producto" },
      { status: 500 }
    )
  }
}
