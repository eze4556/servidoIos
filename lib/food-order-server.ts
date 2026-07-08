import { auth as adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { configureMercadoPago, getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import type { DeliveryMode, FoodOrderItem } from "@/types/restaurant"

export type CreateFoodPreferencePayload = {
  restaurantId: string
  buyerId: string
  buyerEmail: string
  items: { menuItemId: string; quantity: number }[]
  deliveryMode: DeliveryMode
  address?: string
  phone?: string
  notes?: string
  deliveryFee?: number
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) return null
  return authorizationHeader.slice(7).trim()
}

async function requireAuthenticatedUser(request: Request, expectedUserId?: string) {
  const token = getBearerToken(request)
  if (!token) throw new Error("No autorizado")
  const decodedToken = await adminAuth.verifyIdToken(token)
  if (expectedUserId && decodedToken.uid !== expectedUserId) {
    throw new Error("El usuario autenticado no coincide con buyerId")
  }
  return decodedToken
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

export async function createMercadoPagoFoodPreference(request: Request, body: CreateFoodPreferencePayload) {
  const { restaurantId, buyerId, buyerEmail, items, deliveryMode, address, phone, notes, deliveryFee = 0 } = body

  if (!restaurantId || !buyerId || !buyerEmail) {
    throw new Error("Faltan datos del pedido")
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido no tiene items")
  }

  await requireAuthenticatedUser(request, buyerId)

  const restaurantDoc = await getDoc(doc(db, "restaurants", restaurantId))
  if (!restaurantDoc.exists()) {
    throw new Error("Restaurante no encontrado")
  }
  const restaurantData = restaurantDoc.data()

  const validatedItems: FoodOrderItem[] = []
  let subtotal = 0

  for (const item of items) {
    const menuDoc = await getDoc(doc(db, "menuItems", item.menuItemId))
    if (!menuDoc.exists()) {
      throw new Error(`Plato no encontrado: ${item.menuItemId}`)
    }
    const menuData = menuDoc.data()
    if (menuData.restaurantId !== restaurantId) {
      throw new Error("El plato no pertenece a este restaurante")
    }
    if (menuData.available === false) {
      throw new Error(`El plato ${menuData.name} no está disponible`)
    }
    const price = Number(menuData.price) || 0
    const lineTotal = roundMoney(price * item.quantity)
    subtotal += lineTotal
    validatedItems.push({
      menuItemId: item.menuItemId,
      name: menuData.name,
      price,
      quantity: item.quantity,
    })
  }

  subtotal = roundMoney(subtotal)
  const fee = roundMoney(deliveryFee)
  const total = roundMoney(subtotal + fee)
  const orderId = `food_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const preference = configureMercadoPago()
  const mpItems = validatedItems.map((item) => ({
    id: item.menuItemId,
    title: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    currency_id: "ARS",
  }))

  if (fee > 0) {
    mpItems.push({
      id: "delivery_fee",
      title: "Costo de envío",
      quantity: 1,
      unit_price: fee,
      currency_id: "ARS",
    })
  }

  const siteUrl = getMercadoPagoSiteUrl(request)
  const preferenceData: Record<string, unknown> = {
    items: mpItems,
    back_urls: {
      success: `${siteUrl}/purchase/success`,
      failure: `${siteUrl}/purchase/failure`,
      pending: `${siteUrl}/purchase/pending`,
    },
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
    external_reference: orderId,
    payer: { email: buyerEmail },
    auto_return: "approved",
  }

  const result = (await preference.preferences.create(preferenceData)) as { id?: string; init_point?: string }

  await setDoc(doc(db, "foodOrders", orderId), {
    id: orderId,
    buyerId,
    buyerEmail,
    restaurantId,
    restaurantName: restaurantData.name || "Restaurante",
    items: validatedItems,
    subtotal,
    deliveryFee: fee,
    total,
    deliveryMode,
    address: address || null,
    phone: phone || null,
    notes: notes || null,
    status: "recibido",
    paymentStatus: "pending",
    preferenceId: result.id || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: result.id,
    init_point: result.init_point,
    orderId,
  }
}

export async function updateFoodOrderPaymentStatus(
  orderId: string,
  paymentStatus: "pending" | "approved" | "rejected" | "cancelled",
  paymentId?: string
) {
  const orderRef = doc(db, "foodOrders", orderId)
  const orderSnap = await getDoc(orderRef)
  if (!orderSnap.exists()) return false

  await updateDoc(orderRef, {
    paymentStatus,
    paymentId: paymentId || null,
    updatedAt: serverTimestamp(),
    ...(paymentStatus === "approved" ? { status: "recibido" } : {}),
    ...(paymentStatus === "cancelled" || paymentStatus === "rejected" ? { status: "cancelado" } : {}),
  })
  return true
}
