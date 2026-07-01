import { NextRequest, NextResponse } from "next/server"
import { getMercadoPagoConnectionStatus } from "@/lib/mercadopago-server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") || undefined
    const result = await getMercadoPagoConnectionStatus(request, userId)
    console.info(JSON.stringify({
      scope: "mercado-pago",
      event: "connection_status_checked",
      ts: new Date().toISOString(),
      userId: result.userId,
      connected: result.connected,
      tokenExpired: result.tokenExpired ?? false,
      status: result.status ?? "unknown",
    }))
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error(JSON.stringify({
      scope: "mercado-pago",
      event: "connection_status_failed",
      ts: new Date().toISOString(),
      error: message,
    }))
    return NextResponse.json(
      {
        error: message,
      },
      { status: message.includes("No autorizado") ? 401 : 500 }
    )
  }
}
