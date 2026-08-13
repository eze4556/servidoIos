import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import {
  generateRestaurantCommissionBatches,
  markRestaurantCommissionPaid,
} from "@/lib/delivery-settlements-admin"

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }
  const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
  if (!(await isFirestoreAdmin(decoded.uid))) {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) }
  }
  return { uid: decoded.uid }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth && auth.error) return auth.error

    const status = request.nextUrl.searchParams.get("status") || "pending_collection"
    const snap = await adminDb
      .collection("restaurantCommissionBatches")
      .where("status", "==", status)
      .limit(100)
      .get()

    const batches = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    batches.sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      return tb - ta
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error("GET /api/admin/restaurant-commissions", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth && auth.error) return auth.error
    const result = await generateRestaurantCommissionBatches(auth.uid!)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("POST /api/admin/restaurant-commissions", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ("error" in auth && auth.error) return auth.error

    const body = await request.json()
    const batchId = String(body?.batchId || "").trim()
    if (!batchId) {
      return NextResponse.json({ error: "batchId requerido" }, { status: 400 })
    }

    try {
      const result = await markRestaurantCommissionPaid(batchId, auth.uid!)
      return NextResponse.json({ ok: true, ...result })
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
      }
      throw err
    }
  } catch (error) {
    console.error("PATCH /api/admin/restaurant-commissions", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
