import { NextRequest, NextResponse } from "next/server"
import { createFoodOrder } from "@/lib/food-order-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createFoodOrder(request, body)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("create-food-preference error:", message)
    const status =
      message.includes("No autorizado") || message.includes("no coincide")
        ? 401
        : message.includes("no encontrado") ||
            message.includes("no está disponible") ||
            message.includes("no tiene") ||
            message.includes("no acepta") ||
            message.includes("Elegí") ||
            message.includes("conectar") ||
            message.includes("transferencia") ||
            message.includes("Faltan")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
