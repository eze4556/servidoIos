import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import {
  ClaimRefundError,
  executeClaimRefund,
  getClaimRefundPreview,
  type ClaimRefundMode,
} from "@/lib/claim-refunds-server"

async function requireAdmin(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new ClaimRefundError("No autorizado", "unauthorized", 401)
  }
  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
  } catch {
    throw new ClaimRefundError("No autorizado", "unauthorized", 401)
  }
  if (!(await isFirestoreAdmin(decoded.uid))) {
    throw new ClaimRefundError("Acceso denegado", "forbidden", 403)
  }
  return decoded
}

function errorResponse(error: unknown) {
  if (error instanceof ClaimRefundError) {
    return NextResponse.json(
      { error: error.message, code: error.code, ...(error.extra || {}) },
      { status: error.httpStatus }
    )
  }
  const message = error instanceof Error ? error.message : "Error interno"
  const unauthorized = message.includes("No autorizado") || message.includes("auth")
  return NextResponse.json(
    { error: unauthorized ? "No autorizado" : "No se pudo procesar el reembolso" },
    { status: unauthorized ? 401 : 500 }
  )
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const claimId = String(request.nextUrl.searchParams.get("claimId") || "").trim()
    if (!claimId) {
      return NextResponse.json({ error: "Falta claimId" }, { status: 400 })
    }
    const preview = await getClaimRefundPreview(claimId)
    return NextResponse.json(preview)
  } catch (error) {
    console.error("admin claim refund preview:", error)
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json().catch(() => null)
    const claimId = String(body?.claimId || "").trim()
    const mode = String(body?.mode || "").trim() as ClaimRefundMode
    const amountRaw = body?.amount
    const amount = amountRaw == null || amountRaw === "" ? undefined : Number(amountRaw)

    if (!claimId) {
      return NextResponse.json({ error: "Falta claimId" }, { status: 400 })
    }
    if (mode !== "total" && mode !== "partial") {
      return NextResponse.json({ error: "El modo tiene que ser total o parcial" }, { status: 400 })
    }

    const result = await executeClaimRefund({
      claimId,
      mode,
      amount,
      adminId: admin.uid,
      adminName: String(admin.name || admin.email || "Servido"),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("admin claim refund execute:", error)
    return errorResponse(error)
  }
}
