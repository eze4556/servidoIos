import { NextRequest, NextResponse } from "next/server"
import { createMercadoPagoProductPreference } from "@/lib/mercadopago-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createMercadoPagoProductPreference(request, body)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error(JSON.stringify({
      scope: "mercado-pago",
      event: "create_preference_failed",
      ts: new Date().toISOString(),
      error: message,
    }))
    const status =
      message.includes("No autorizado") || message.includes("no coincide")
        ? 401
        : message.includes("Mercado Pago") || message.includes("conectar su cuenta")
          ? 409
          : message.includes("no encontrado") || message.includes("invalid") || message.includes("Stock insuficiente") || message.includes("vacío")
            ? 400
            : 500
    return NextResponse.json(
      {
        error: message,
      },
      { status }
    )
  }
}
