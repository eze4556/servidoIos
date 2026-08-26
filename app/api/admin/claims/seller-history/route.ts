import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import { ClaimModerationError, getSellerClaimHistory } from "@/lib/claim-seller-moderation-server"

async function requireAdmin(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ClaimModerationError("No autorizado", "unauthorized", 401)
  }
  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
  } catch {
    throw new ClaimModerationError("No autorizado", "unauthorized", 401)
  }
  if (!(await isFirestoreAdmin(decoded.uid))) {
    throw new ClaimModerationError("Acceso denegado", "forbidden", 403)
  }
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const sellerId = String(request.nextUrl.searchParams.get("sellerId") || "").trim()
    const history = await getSellerClaimHistory(sellerId)
    return NextResponse.json(history)
  } catch (error) {
    if (error instanceof ClaimModerationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus })
    }
    console.error("admin seller claim history:", error)
    return NextResponse.json({ error: "No se pudo cargar el historial" }, { status: 500 })
  }
}
