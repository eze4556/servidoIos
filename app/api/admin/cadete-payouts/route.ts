import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import {
  generateCadetePayoutBatches,
  markCadetePayoutPaid,
} from "@/lib/delivery-settlements-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    if (!(await isFirestoreAdmin(decoded.uid))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get("status") || "pending_payout"
    const snap = await adminDb.collection("cadetePayoutBatches").where("status", "==", status).limit(100).get()

    const batches = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data()
        const uid = String(data.cadeteId || "")
        let userEmail = ""
        if (uid) {
          const u = await adminDb.collection("users").doc(uid).get()
          userEmail = String(u.data()?.email || "")
        }
        return { id: d.id, ...data, userEmail }
      })
    )

    batches.sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      return tb - ta
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error("GET /api/admin/cadete-payouts", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    if (!(await isFirestoreAdmin(decoded.uid))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const result = await generateCadetePayoutBatches(decoded.uid)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("POST /api/admin/cadete-payouts", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    if (!(await isFirestoreAdmin(decoded.uid))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const batchId = String(body?.batchId || "").trim()
    if (!batchId) {
      return NextResponse.json({ error: "batchId requerido" }, { status: 400 })
    }

    try {
      const result = await markCadetePayoutPaid(batchId, decoded.uid)
      return NextResponse.json({ ok: true, ...result })
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
      }
      throw err
    }
  } catch (error) {
    console.error("PATCH /api/admin/cadete-payouts", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
