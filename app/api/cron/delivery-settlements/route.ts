import { NextRequest, NextResponse } from "next/server"
import {
  generateCadetePayoutBatches,
  generateRestaurantCommissionBatches,
} from "@/lib/delivery-settlements-admin"

export const runtime = "nodejs"
export const maxDuration = 60

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  return authorizationHeader === `Bearer ${cronSecret}`
}

/** Martes 09:00 ART (cron UTC). También se puede disparar a mano con CRON_SECRET. */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [cadetes, restaurants] = await Promise.all([
      generateCadetePayoutBatches("cron"),
      generateRestaurantCommissionBatches("cron"),
    ])

    return NextResponse.json({
      ok: true,
      generatedBy: "cron",
      cadetes: {
        created: cadetes.created.length,
        batches: cadetes.created,
      },
      restaurants: {
        created: restaurants.created.length,
        batches: restaurants.created,
      },
    })
  } catch (error) {
    console.error("GET /api/cron/delivery-settlements", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
