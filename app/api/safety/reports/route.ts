import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"
import { requireBearerUid } from "@/lib/lives-auth"
import { db } from "@/lib/firebase-admin"
import { parseReport } from "@/lib/safety-policy"
import { resolveReportTarget } from "@/lib/safety-server"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  const actor = await requireBearerUid(request)
  if ("error" in actor) return actor.error
  let input: ReturnType<typeof parseReport>
  try { input = parseReport(await request.json()) }
  catch { return NextResponse.json({ error: "INVALID_REPORT" }, { status: 400 }) }
  try {
    const target = await resolveReportTarget(input.kind, input.targetId, actor.uid)
    const id = createHash("sha256").update(`${actor.uid}:${input.kind}:${input.targetId}`).digest("hex")
    const ref = db.collection("contentReports").doc(id)
    await db.runTransaction(async tx => {
      const existing = await tx.get(ref)
      if (existing.exists && existing.data()?.status === "open") return
      tx.set(ref, { ...input, authorId: target.authorId, evidence: target.evidence,
        reporterId: actor.uid, status: "open", createdAt: FieldValue.serverTimestamp() })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const code = (error as Error).message
    if (["TARGET_NOT_FOUND", "FORBIDDEN", "INVALID_TARGET"].includes(code)) {
      return NextResponse.json({ error: code }, { status: code === "FORBIDDEN" ? 403 : 400 })
    }
    console.error("[safety/reports] No se pudo guardar el reporte")
    return NextResponse.json({ error: "SAFETY_FAILED" }, { status: 500 })
  }
}
