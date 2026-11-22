import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { deleteUserAccount } from "@/lib/account-deletion"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  let uid: string
  try {
    const decoded = await auth.verifyIdToken(token, true)
    if (!decoded.auth_time || Date.now() / 1000 - decoded.auth_time > 600) {
      return NextResponse.json({ code: "REAUTH_REQUIRED", error: "Confirmá tu contraseña para eliminar la cuenta" }, { status: 401 })
    }
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (typeof body?.confirm !== "string" || body.confirm.trim().toUpperCase() !== "ELIMINAR") {
      return NextResponse.json({ error: "Escribí ELIMINAR para confirmar" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  try {
    await deleteUserAccount(uid)
    return NextResponse.json({ ok: true })
  } catch {
    console.error("[account/delete] No se pudo completar la eliminación", { uid })
    return NextResponse.json({ error: "No se pudo eliminar la cuenta. Intentá de nuevo." }, { status: 500 })
  }
}
