import { NextRequest, NextResponse } from "next/server"
import { db as adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = String(body?.code || "").trim()
    if (!code) {
      return NextResponse.json({ error: "code requerido" }, { status: 400 })
    }

    const snap = await adminDb.collection("resellerLinks").where("code", "==", code).limit(1).get()
    if (snap.empty) {
      return NextResponse.json({ ok: true })
    }

    const docRef = snap.docs[0].ref
    await docRef.update({
      clickCount: FieldValue.increment(1),
      lastClickAt: FieldValue.serverTimestamp(),
    })

    const referrerUserId = snap.docs[0].data()?.referrerUserId as string | undefined
    if (referrerUserId) {
      await adminDb
        .collection("resellerStats")
        .doc(referrerUserId)
        .set(
          {
            referrerUserId,
            totalClicks: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/reseller/click", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
