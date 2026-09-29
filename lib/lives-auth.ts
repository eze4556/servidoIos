import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db } from "@/lib/firebase-admin"

export type LiveSellerUser = {
  uid: string
  name: string
  photoURL: string | null
  role: string
  businessType: string | null
}

export async function requireBearerUid(request: NextRequest): Promise<
  { uid: string } | { error: NextResponse }
> {
  const authorizationHeader =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }
  try {
    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    return { uid: decoded.uid }
  } catch {
    return { error: NextResponse.json({ error: "Token inválido" }, { status: 401 }) }
  }
}

/** Solo seller de tienda (productos/servicios), no restaurante. */
export async function requireLiveSeller(request: NextRequest): Promise<
  { user: LiveSellerUser } | { error: NextResponse }
> {
  const auth = await requireBearerUid(request)
  if ("error" in auth) return auth

  const snap = await db.collection("users").doc(auth.uid).get()
  if (!snap.exists) {
    return { error: NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 }) }
  }
  const data = snap.data() || {}
  const role = String(data.role || "user")
  const businessType = data.businessType ? String(data.businessType) : null

  if (role !== "seller") {
    return {
      error: NextResponse.json(
        { error: "Solo las tiendas pueden transmitir en vivo" },
        { status: 403 }
      ),
    }
  }
  if (businessType === "restaurant") {
    return {
      error: NextResponse.json(
        { error: "Los lives del MVP son solo para tiendas de productos y servicios" },
        { status: 403 }
      ),
    }
  }

  return {
    user: {
      uid: auth.uid,
      name: String(data.name || data.displayName || "Tienda"),
      photoURL: (data.photoURL as string | null | undefined) || null,
      role,
      businessType,
    },
  }
}
