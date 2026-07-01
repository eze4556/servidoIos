import { NextRequest, NextResponse } from "next/server"
import { completeMercadoPagoConnection } from "@/lib/mercadopago-oauth"
import { getMercadoPagoSiteUrl } from "@/lib/mercadopago"

function getDashboardUrl(request: NextRequest, params: Record<string, string>) {
  const siteUrl = getMercadoPagoSiteUrl(request)
  const url = new URL("/dashboard/seller", siteUrl)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url
}

export async function GET(request: NextRequest) {
  try {
    const result = await completeMercadoPagoConnection(request)
    const redirectUrl = getDashboardUrl(request, {
      mercadopago: result.status === "connected" ? "connected" : "error",
    })
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar la conexión"
    console.error(JSON.stringify({
      scope: "mercado-pago",
      event: "connect_callback_failed",
      ts: new Date().toISOString(),
      error: message,
    }))
    const redirectUrl = getDashboardUrl(request, {
      mercadopago: "error",
      reason: message,
    })
    return NextResponse.redirect(redirectUrl)
  }
}
