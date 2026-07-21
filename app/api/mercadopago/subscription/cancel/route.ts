import { NextRequest, NextResponse } from "next/server"
import { cancelRecurringSubscription } from "@/lib/mercadopago-subscriptions"

export async function POST(request: NextRequest) {
  try {
    const result = await cancelRecurringSubscription(request)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("[MercadoPago] subscription cancel failed:", message)

    const status =
      message.includes("No autorizado") || message.includes("no coincide")
        ? 401
        : message.includes("no encontrado")
          ? 404
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
