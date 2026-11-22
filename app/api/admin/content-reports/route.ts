import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireBearerUid } from "@/lib/lives-auth"
import { REPORT_KINDS, validSafetyId, type ReportKind } from "@/lib/safety-policy"
import { requireSafetyAdmin, removeReportedContent, suspendReportedUser } from "@/lib/safety-server"

export const runtime = "nodejs"
async function admin(request: NextRequest) {
  const actor = await requireBearerUid(request)
  if ("error" in actor) return actor
  if (!(await requireSafetyAdmin(actor.uid))) return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) }
  return actor
}
export async function GET(request: NextRequest) {
  const actor = await admin(request)
  if ("error" in actor) return actor.error
  try {
    const snap = await db.collection("contentReports").where("status", "==", "open").limit(100).get()
    return NextResponse.json({ reports: snap.docs.map(row => ({ id: row.id, ...row.data(), createdAt: row.data().createdAt?.toDate()?.toISOString() || null })) })
  } catch { return NextResponse.json({ error: "SAFETY_FAILED" }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  const actor = await admin(request)
  if ("error" in actor) return actor.error
  try {
    const body = await request.json()
    if (!validSafetyId(body?.reportId) || !["dismiss", "remove", "suspend"].includes(body.action)) {
      return NextResponse.json({ error: "INVALID_REPORT" }, { status: 400 })
    }
    const ref = db.collection("contentReports").doc(body.reportId)
    const report = (await ref.get()).data()
    if (!report || report.status !== "open") return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 })
    if (!REPORT_KINDS.includes(report.kind) || !validSafetyId(report.targetId) || !validSafetyId(report.authorId)) throw new Error("Invalid stored report")
    if (body.action === "remove") await removeReportedContent(report.kind as ReportKind, report.targetId)
    if (body.action === "suspend") await suspendReportedUser(report.authorId)
    await ref.update({ status: "resolved", action: body.action, resolvedBy: actor.uid, resolvedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ ok: true })
  } catch {
    console.error("[safety/admin] No se pudo resolver el reporte")
    return NextResponse.json({ error: "SAFETY_FAILED" }, { status: 500 })
  }
}
