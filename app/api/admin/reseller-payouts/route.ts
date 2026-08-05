import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import { FieldValue } from "firebase-admin/firestore"

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
    const snap = await adminDb
      .collection("resellerPayoutBatches")
      .where("status", "==", status)
      .limit(100)
      .get()

    const batches = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data()
        const uid = String(data.referrerUserId || "")
        let userEmail = ""
        let userName = ""
        if (uid) {
          const u = await adminDb.collection("users").doc(uid).get()
          userEmail = String(u.data()?.email || "")
          userName = String(u.data()?.displayName || u.data()?.name || "")
        }
        return { id: d.id, ...data, userEmail, userName }
      })
    )

    batches.sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() || 0
      return tb - ta
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error("GET /api/admin/reseller-payouts", error)
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
    const adminNote = body?.adminNote ? String(body.adminNote) : null
    if (!batchId) {
      return NextResponse.json({ error: "batchId requerido" }, { status: 400 })
    }

    const ref = adminDb.collection("resellerPayoutBatches").doc(batchId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
    }
    const data = snap.data() as { status?: string; referrerUserId?: string; amount?: number }
    if (data.status === "paid") {
      return NextResponse.json({ ok: true, already: true })
    }

    await ref.update({
      status: "paid",
      paidAt: new Date().toISOString(),
      paidByAdminId: decoded.uid,
      adminNote,
    })

    const referrerUserId = data.referrerUserId
    if (referrerUserId) {
      await adminDb
        .collection("resellerStats")
        .doc(referrerUserId)
        .set(
          {
            lifetimePaidAmount: FieldValue.increment(Number(data.amount || 0)),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PATCH /api/admin/reseller-payouts", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
