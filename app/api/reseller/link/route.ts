import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

function randomCode(): string {
  return Math.random().toString(36).slice(2, 12)
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const token = authHeader.slice(7).trim()
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    const body = await request.json()
    const productId = String(body?.productId || "").trim()
    if (!productId) {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 })
    }

    const productSnap = await adminDb.collection("products").doc(productId).get()
    if (!productSnap.exists) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }
    const product = productSnap.data() as {
      sellerId?: string
      vendedorId?: string
      isService?: boolean
      allowResellerShare?: boolean
    }
    if (product.isService) {
      return NextResponse.json({ error: "Los servicios no participan" }, { status: 400 })
    }
    if (!product.allowResellerShare) {
      return NextResponse.json({ error: "El vendedor no habilitó revendedores" }, { status: 400 })
    }

    const sellerId = product.sellerId || product.vendedorId || ""
    if (sellerId === uid) {
      return NextResponse.json({ error: "No podés recomendar tu propio producto" }, { status: 400 })
    }

    const userSnap = await adminDb.collection("users").doc(uid).get()
    const payout = userSnap.data()?.resellerPayoutInfo as Record<string, unknown> | undefined
    const hasPayout =
      payout &&
      String(payout.titular || "").trim() &&
      (String(payout.cbu || "").trim() || String(payout.alias || "").trim())
    if (!hasPayout) {
      return NextResponse.json({ error: "missing_payout_info" }, { status: 400 })
    }

    const existing = await adminDb
      .collection("resellerLinks")
      .where("referrerUserId", "==", uid)
      .where("productId", "==", productId)
      .limit(1)
      .get()

    if (!existing.empty) {
      const doc = existing.docs[0]
      const data = doc.data()
      return NextResponse.json({
        code: data.code,
        linkId: doc.id,
        productId,
      })
    }

    let code = randomCode()
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await adminDb.collection("resellerLinks").where("code", "==", code).limit(1).get()
      if (clash.empty) break
      code = randomCode()
    }

    const ref = await adminDb.collection("resellerLinks").add({
      code,
      productId,
      referrerUserId: uid,
      sellerId,
      clickCount: 0,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ code, linkId: ref.id, productId })
  } catch (error) {
    console.error("POST /api/reseller/link", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
