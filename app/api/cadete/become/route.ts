import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { auth as adminAuth, db } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const ALLOWED_VEHICLES = new Set(["bicycle", "motorcycle", "car", "on_foot"])

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
    if (role === "cadete") {
      return NextResponse.json({ ok: true, alreadyCadete: true })
    }
    if (role === "admin" || role === "seller") {
      return NextResponse.json(
        { error: "Esta cuenta no puede convertirse en cadete desde acá" },
        { status: 400 }
      )
    }
    if (role !== "user" && role !== "buyer") {
      return NextResponse.json({ error: "Rol no válido para postularse como cadete" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const zone = String(body?.zone || "").trim()
    const vehicle = String(body?.vehicle || "").trim()
    const documentId = String(body?.documentId || "").trim()
    const acceptTerms = Boolean(body?.acceptTerms)

    if (!zone || !documentId) {
      return NextResponse.json({ error: "Completá tu zona y documento" }, { status: 400 })
    }
    if (!ALLOWED_VEHICLES.has(vehicle)) {
      return NextResponse.json({ error: "Seleccioná un vehículo válido" }, { status: 400 })
    }
    if (!acceptTerms) {
      return NextResponse.json({ error: "Debés aceptar los términos de cadete" }, { status: 400 })
    }

    await userRef.update({
      role: "cadete",
      status: "pending_approval",
      zone,
      vehicle,
      documentId,
      isActive: false,
      cadeteTermsAccepted: true,
      cadeteTermsAcceptedAt: FieldValue.serverTimestamp(),
      becameCadeteAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/cadete/become", error)
    return NextResponse.json({ error: "No se pudo postular como cadete" }, { status: 500 })
  }
}
