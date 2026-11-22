import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { requireBearerUid } from "@/lib/lives-auth"
import { db } from "@/lib/firebase-admin"
import { validSafetyId } from "@/lib/safety-policy"
import { SERVIDO_OFFICIAL_USER_ID } from "@/lib/servido-official"

export const runtime = "nodejs"
async function changeBlock(request: NextRequest, remove: boolean) {
  const actor = await requireBearerUid(request)
  if ("error" in actor) return actor.error
  try {
    const body = await request.json()
    if (!validSafetyId(body?.targetUid) || body.targetUid === actor.uid || body.targetUid === SERVIDO_OFFICIAL_USER_ID) {
      return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 })
    }
    const target = db.collection("users").doc(body.targetUid)
    const ref = db.collection("users").doc(actor.uid).collection("blockedUsers").doc(body.targetUid)
    if (remove) await ref.delete()
    else {
      if (!(await target.get()).exists) return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 })
      await ref.set({ createdAt: FieldValue.serverTimestamp() })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "SAFETY_FAILED" }, { status: 500 })
  }
}
export const POST = (request: NextRequest) => changeBlock(request, false)
export const DELETE = (request: NextRequest) => changeBlock(request, true)
