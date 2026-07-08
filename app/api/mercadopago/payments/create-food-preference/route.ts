import { NextRequest, NextResponse } from "next/server"
import { createMercadoPagoFoodPreference } from "@/lib/food-order-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createMercadoPagoFoodPreference(request, body)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("create-food-preference error:", message)
    const status =
      message.includes("No autorizado") || message.includes("no coincide")
        ? 401
        : message.includes("no encontrado") || message.includes("no está disponible") || message.includes("no tiene")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
