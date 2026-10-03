import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireLiveSeller } from "@/lib/lives-auth"
import { LIVE_PINNED_MAX, type LivePinnedProduct } from "@/types/live"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }
type PinAction = "add" | "remove" | "focus" | "clear" | "setPrice"

const MAX_LIVE_PRICE = 99_999_999

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

function parseLivePrice(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."))
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n)
  if (rounded < 1 || rounded > MAX_LIVE_PRICE) return null
  return rounded
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
    const price = Number(p.price) || 0
    const originalRaw = Number(p.originalPrice)
    out.push({
      productId,
      title: String(p.title || "Producto"),
      price,
      originalPrice: Number.isFinite(originalRaw) && originalRaw > 0 ? originalRaw : price,
      imageUrl: (p.imageUrl as string | null | undefined) ?? null,
      currency: String(p.currency || "ARS"),
      category: (p.category as string | null | undefined) ?? null,
    })
  }
  return out.slice(0, LIVE_PINNED_MAX)
}

async function loadPinnedProduct(
  productId: string,
  sellerUid: string,
  livePrice?: number | null
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
  const catalogPrice = Math.max(0, Math.round(Number(product.price) || 0))
  const price =
    typeof livePrice === "number" && livePrice >= 1 ? livePrice : catalogPrice || 1
  return {
    productId,
    title: String(product.name || product.title || "Producto"),
    price,
    originalPrice: catalogPrice || price,
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
    const livePrice = parseLivePrice(body?.price)

    if (body?.price !== undefined && body?.price !== null && body?.price !== "" && livePrice === null) {
      return NextResponse.json(
        { error: "Precio inválido. Usá un número entero mayor a 0." },
        { status: 400 }
      )
    }

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

    if (action === "setPrice") {
      if (livePrice === null) {
        return NextResponse.json({ error: "Indicá el precio del vivo" }, { status: 400 })
      }
      const idx = list.findIndex((p) => p.productId === productId)
      if (idx < 0) {
        return NextResponse.json({ error: "Ese producto no está fijado" }, { status: 404 })
      }
      const updated: LivePinnedProduct = {
        ...list[idx],
        price: livePrice,
        originalPrice: list[idx].originalPrice || list[idx].price,
      }
      list = [updated, ...list.filter((p) => p.productId !== productId)]
      await ref.update({
        pinnedProduct: updated,
        pinnedProducts: list,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ pinnedProduct: updated, pinnedProducts: list })
    }

    // add (default) — si ya está, actualiza precio (si vino) y lo pone al frente
    const existing = list.find((p) => p.productId === productId)
    if (existing && livePrice === null) {
      const reordered = [existing, ...list.filter((p) => p.productId !== productId)]
      await ref.update({
        pinnedProduct: existing,
        pinnedProducts: reordered,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ pinnedProduct: existing, pinnedProducts: reordered })
    }

    const loaded = await loadPinnedProduct(
      productId,
      auth.user.uid,
      livePrice ?? (existing ? existing.price : null)
    )
    if ("error" in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    // Conservar originalPrice si ya estaba fijado.
    if (existing?.originalPrice) {
      loaded.originalPrice = existing.originalPrice
    }
    if (livePrice !== null) {
      loaded.price = livePrice
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
