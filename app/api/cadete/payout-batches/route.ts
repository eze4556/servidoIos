import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get()
    if (userSnap.data()?.role !== "cadete") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }
    const snap = await adminDb
      .collection("cadetePayoutBatches")
      .where("cadeteId", "==", decoded.uid)
      .limit(50)
      .get()

    const batches = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    batches.sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      return tb - ta
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error("GET /api/cadete/payout-batches", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
