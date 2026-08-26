import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import { applySellerClaimSanction, ClaimModerationError } from "@/lib/claim-seller-moderation-server"
import { CLAIM_SANCTION_TYPES, type ClaimSanctionType } from "@/types/claim-moderation"

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

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json().catch(() => null)
    const sellerId = String(body?.sellerId || "").trim()
    const type = String(body?.type || "").trim() as ClaimSanctionType
    const note = body?.note ? String(body.note) : ""
    const claimId = body?.claimId ? String(body.claimId).trim() : undefined
    const productUploadLimit =
      body?.productUploadLimit == null || body?.productUploadLimit === ""
        ? undefined
        : Number(body.productUploadLimit)

    if (!sellerId) {
      return NextResponse.json({ error: "Falta sellerId" }, { status: 400 })
    }
    if (!CLAIM_SANCTION_TYPES.includes(type)) {
      return NextResponse.json({ error: "Tipo de sanción inválido" }, { status: 400 })
    }

    const result = await applySellerClaimSanction({
      sellerId,
      type,
      note,
      claimId,
      productUploadLimit,
      adminId: admin.uid,
      adminName: String(admin.name || admin.email || "Admin"),
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ClaimModerationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus })
    }
    console.error("admin claim sanction:", error)
    return NextResponse.json({ error: "No se pudo aplicar la sanción" }, { status: 500 })
  }
}
