import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"

function resolveProductImageUrl(data: Record<string, unknown>): string | null {
  if (typeof data.imageUrl === "string" && data.imageUrl.trim()) {
    return data.imageUrl.trim()
  }
  const media = data.media
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0] as { url?: string }
    if (typeof first?.url === "string" && first.url.trim()) {
      return first.url.trim()
    }
  }
  return null
}

/** Descarga imagen del producto en el servidor (evita CORS de Storage en el navegador). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    await adminAuth.verifyIdToken(authHeader.slice(7).trim())

    const productId = request.nextUrl.searchParams.get("productId")?.trim()
    if (!productId) {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 })
    }

    const snap = await adminDb.collection("products").doc(productId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const imageUrl = resolveProductImageUrl(snap.data() as Record<string, unknown>)
    if (!imageUrl) {
      return NextResponse.json({ error: "Sin imagen" }, { status: 404 })
    }

    const upstream = await fetch(imageUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: "No se pudo obtener la imagen" }, { status: 502 })
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg"
    const buffer = Buffer.from(await upstream.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    console.error("GET /api/reseller/product-image", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
