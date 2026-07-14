import { NextRequest, NextResponse } from "next/server"
import { completeMercadoPagoConnection } from "@/lib/mercadopago-oauth"
import { getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

async function getDashboardPathForUser(userId: string | null | undefined) {
  if (!userId) return "/dashboard/seller"
  try {
    const snap = await getDoc(doc(db, "users", userId))
    if (!snap.exists()) return "/dashboard/seller"
    const data = snap.data()
    if (data.businessType === "restaurant" || data.role === "cadete") {
      return data.businessType === "restaurant" ? "/dashboard/restaurant" : "/dashboard/cadete"
    }
    if (data.role === "seller") return "/dashboard/seller"
    return "/dashboard/seller"
  } catch {
    return "/dashboard/seller"
  }
}

function getDashboardUrl(request: NextRequest, path: string, params: Record<string, string>) {
  const siteUrl = getMercadoPagoSiteUrl(request)
  const url = new URL(path, siteUrl)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url
}

export async function GET(request: NextRequest) {
  try {
    const result = await completeMercadoPagoConnection(request)
    const path = await getDashboardPathForUser(result.userId)
    const redirectUrl = getDashboardUrl(request, path, {
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
    // best-effort: seller dashboard
    const redirectUrl = getDashboardUrl(request, "/dashboard/seller", {
      mercadopago: "error",
      reason: message,
    })
    return NextResponse.redirect(redirectUrl)
  }
}
