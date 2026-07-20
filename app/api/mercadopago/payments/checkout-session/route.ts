import { NextRequest, NextResponse } from "next/server"
import { getCheckoutSession } from "@/lib/mercadopago-server"
import { auth as adminAuth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("id") || request.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "id de sesión requerido" }, { status: 400 })
    }

    const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    const session = await getCheckoutSession(sessionId)

    if (session.buyerId && session.buyerId !== decoded.uid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payments = Array.isArray(session.payments) ? session.payments : []
    const nextPayment =
      payments.find((p: any) => p.status === "pending" && p.init_point) ||
      payments.find((p: any) => p.status === "pending") ||
      null

    return NextResponse.json({
      ...session,
      nextPayment,
      completedCount: payments.filter((p: any) => p.status === "approved").length,
      totalCount: payments.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno"
    const status = message.includes("no encontrada") ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
