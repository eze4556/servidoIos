import { NextRequest, NextResponse } from "next/server"
import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    const snap = await adminDb.collection("users").doc(decoded.uid).get()
    return NextResponse.json({ payoutInfo: snap.data()?.resellerPayoutInfo || null })
  } catch (error) {
    console.error("GET /api/reseller/payout-info", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    const body = await request.json()

    const titular = String(body?.titular || "").trim()
    const cbu = String(body?.cbu || "").replace(/\s/g, "")
    const alias = String(body?.alias || "").trim()
    const banco = String(body?.banco || "").trim()
    const dni = String(body?.dni || "").trim()

    if (!titular) {
      return NextResponse.json({ error: "Titular requerido" }, { status: 400 })
    }
    if (!cbu && !alias) {
      return NextResponse.json({ error: "CBU/CVU o alias requerido" }, { status: 400 })
    }

    const payoutInfo = {
      titular,
      cbu: cbu || null,
      alias: alias || null,
      banco: banco || null,
      dni: dni || null,
      updatedAt: new Date().toISOString(),
    }

    await adminDb.collection("users").doc(decoded.uid).set(
      {
        resellerPayoutInfo: payoutInfo,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, payoutInfo })
  } catch (error) {
    console.error("PUT /api/reseller/payout-info", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
