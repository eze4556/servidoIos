import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import { hasValidCoordinates } from "@/lib/geo"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader =
      request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    const uid = decoded.uid
    const userRef = db.collection("users").doc(uid)
    const snap = await userRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const data = snap.data() || {}
    const role = String(data.role || "user")
    if (role === "seller") {
      return NextResponse.json({ ok: true, alreadySeller: true })
    }
    if (role === "admin" || role === "cadete") {
      return NextResponse.json(
        { error: "Esta cuenta no puede convertirse en tienda desde acá" },
        { status: 400 }
      )
    }
    if (role !== "user" && role !== "buyer") {
      return NextResponse.json({ error: "Rol no válido para abrir tienda" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const storeName = String(body?.storeName || "").trim()
    const acceptTerms = Boolean(body?.acceptTerms)
    const location = body?.location as
      | { label?: string; city?: string | null; latitude?: number; longitude?: number }
      | undefined

    if (!storeName || storeName.length < 2) {
      return NextResponse.json({ error: "El nombre del negocio es obligatorio" }, { status: 400 })
    }
    if (!acceptTerms) {
      return NextResponse.json({ error: "Debés aceptar los términos de vendedor" }, { status: 400 })
    }
    const latitude = Number(location?.latitude)
    const longitude = Number(location?.longitude)
    const label = String(location?.label || "").trim()
    if (!label || !hasValidCoordinates(latitude, longitude)) {
      return NextResponse.json(
        { error: "Indicá la ubicación del negocio en el mapa" },
        { status: 400 }
      )
    }

    await userRef.update({
      role: "seller",
      businessType: "store",
      name: storeName,
      subscription_status: "inactive",
      isSubscribed: false,
      productUploadLimit: typeof data.productUploadLimit === "number" ? data.productUploadLimit : 0,
      businessLocation: {
        label,
        city: location?.city || null,
        latitude,
        longitude,
        updatedAt: Date.now(),
      },
      sellerTermsAccepted: true,
      sellerTermsAcceptedAt: FieldValue.serverTimestamp(),
      becameSellerAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/seller/become", error)
    return NextResponse.json({ error: "No se pudo abrir la tienda" }, { status: 500 })
  }
}
