import { NextRequest, NextResponse } from "next/server"
import { handleMercadoPagoWebhook } from "@/lib/mercadopago-server"

export async function POST(request: NextRequest) {
  try {
    const result = await handleMercadoPagoWebhook(request)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error("Error procesando webhook de MercadoPago:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error procesando notificación",
      },
      { status: 500 }
    )
  }
}
