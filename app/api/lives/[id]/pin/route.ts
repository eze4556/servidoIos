import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireLiveSeller } from "@/lib/lives-auth"
import { LIVE_PINNED_MAX, type LivePinnedProduct } from "@/types/live"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }
type PinAction = "add" | "remove" | "focus" | "clear"

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

function normalizeList(raw: unknown, fallback: unknown): LivePinnedProduct[] {
  const source = Array.isArray(raw) ? raw : fallback ? [fallback] : []
  const out: LivePinnedProduct[] = []
  for (const item of source) {
    if (!item || typeof item !== "object") continue
    const p = item as Record<string, unknown>
    const productId = String(p.productId || "")
    if (!productId) continue
    if (out.some((x) => x.productId === productId)) continue
    out.push({
      productId,
      title: String(p.title || "Producto"),
      price: Number(p.price) || 0,
      imageUrl: (p.imageUrl as string | null | undefined) ?? null,
      currency: String(p.currency || "ARS"),
      category: (p.category as string | null | undefined) ?? null,
    })
  }
  return out.slice(0, LIVE_PINNED_MAX)
}

async function loadPinnedProduct(
  productId: string,
  sellerUid: string
): Promise<LivePinnedProduct | { error: string; status: number }> {
  const productSnap = await db.collection("products").doc(productId).get()
  if (!productSnap.exists) {
    return { error: "Producto no encontrado", status: 404 }
  }
  const product = productSnap.data() || {}
  const ownerId = String(product.sellerId || product.userId || "")
  if (ownerId && ownerId !== sellerUid) {
    return { error: "Ese producto no es de tu tienda", status: 403 }
  }
  return {
    productId,
    title: String(product.name || product.title || "Producto"),
    price: Number(product.price) || 0,
    imageUrl: firstImageUrl(product as Record<string, unknown>),
    currency: String(product.currency || "ARS"),
    category: product.category ? String(product.category) : null,
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await requireLiveSeller(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    const body = await request.json().catch(() => ({}))
    const action = (String(body?.action || "").trim() || "add") as PinAction
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

    let list = normalizeList(live.pinnedProducts, live.pinnedProduct)

    if (action === "clear" || (!productId && action === "add")) {
      await ref.update({
        pinnedProduct: null,
        pinnedProducts: [],
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ pinnedProduct: null, pinnedProducts: [] })
    }

    if (!productId) {
      return NextResponse.json({ error: "Falta productId" }, { status: 400 })
    }

    if (action === "remove") {
      list = list.filter((p) => p.productId !== productId)
      const pinnedProduct = list[0] || null
      await ref.update({
        pinnedProduct,
        pinnedProducts: list,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ pinnedProduct, pinnedProducts: list })
    }

    if (action === "focus") {
      const found = list.find((p) => p.productId === productId)
      if (!found) {
        return NextResponse.json({ error: "Ese producto no está fijado" }, { status: 404 })
      }
      const reordered = [found, ...list.filter((p) => p.productId !== productId)]
      await ref.update({
        pinnedProduct: found,
        pinnedProducts: reordered,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ pinnedProduct: found, pinnedProducts: reordered })
    }

    // add (default) — si ya está, lo pone al frente
    const loaded = await loadPinnedProduct(productId, auth.user.uid)
    if ("error" in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }

    list = [loaded, ...list.filter((p) => p.productId !== productId)].slice(0, LIVE_PINNED_MAX)

    await ref.update({
      pinnedProduct: loaded,
      pinnedProducts: list,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ pinnedProduct: loaded, pinnedProducts: list })
  } catch (err) {
    console.error("[lives/pin]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al fijar producto" },
      { status: 500 }
    )
  }
}
