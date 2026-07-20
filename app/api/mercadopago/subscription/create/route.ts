import { NextRequest, NextResponse } from "next/server"
import { createRecurringSubscription } from "@/lib/mercadopago-subscriptions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createRecurringSubscription(request, body)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("[MercadoPago] subscription create failed:", message)

    const status =
      message.includes("No autorizado") || message.includes("no coincide")
        ? 401
        : message.includes("requeridos") || message.includes("email")
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
