import { NextRequest, NextResponse } from "next/server"
import { processClaimSlaJobs } from "@/lib/claim-sla-server"

export const runtime = "nodejs"
export const maxDuration = 60

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  return authorizationHeader === `Bearer ${cronSecret}`
}

/** Diario: recordatorio ~24 h antes del plazo y escalado a las 72 h. */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processClaimSlaJobs()
    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/cron/claims-sla", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    )
  }
}
