import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, getAdminStorageBucket } from "@/lib/firebase-admin"
import { isAllowedAdminStoragePath, isFirestoreAdmin } from "@/lib/admin-auth-server"

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    const isAdmin = await isFirestoreAdmin(decoded.uid)
    if (!isAdmin) {
      return NextResponse.json({ error: "Se requiere rol admin" }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const path = typeof body?.path === "string" ? body.path.trim() : ""
    if (!path || !isAllowedAdminStoragePath(path)) {
      return NextResponse.json({ error: "Ruta de archivo no permitida" }, { status: 400 })
    }

    const bucket = getAdminStorageBucket()
    await bucket.file(path).delete({ ignoreNotFound: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("admin storage delete:", error)
    return NextResponse.json({ error: "No se pudo eliminar el archivo" }, { status: 500 })
  }
}
