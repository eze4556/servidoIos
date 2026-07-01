import { NextRequest, NextResponse } from "next/server"
import { disconnectMercadoPagoConnection } from "@/lib/mercadopago-oauth"

export async function POST(request: NextRequest) {
  try {
    const result = await disconnectMercadoPagoConnection(request)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error(JSON.stringify({
      scope: "mercado-pago",
      event: "disconnect_failed",
      ts: new Date().toISOString(),
      error: message,
    }))
    const status = message.includes("No autorizado") ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

