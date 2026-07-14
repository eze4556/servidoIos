import { auth as adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { configureMercadoPago, getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import { getMercadoPagoSellerAccessToken } from "@/lib/mercadopago-oauth"
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import type {
  DeliveryMode,
  FoodOrderItem,
  RestaurantPaymentMethod,
} from "@/types/restaurant"

export type CreateFoodOrderPayload = {
  restaurantId: string
  buyerId: string
  buyerEmail: string
  items: { menuItemId: string; quantity: number }[]
  deliveryMode: DeliveryMode
  address?: string
  phone?: string
  notes?: string
  deliveryFee?: number
  paymentMethod: RestaurantPaymentMethod
}

/** @deprecated use CreateFoodOrderPayload */
export type CreateFoodPreferencePayload = CreateFoodOrderPayload

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

async function validateAndBuildOrder(body: CreateFoodOrderPayload) {
  const { restaurantId, buyerId, buyerEmail, items, deliveryMode, address, phone, notes, deliveryFee = 0, paymentMethod } =
    body

  if (!restaurantId || !buyerId || !buyerEmail) {
    throw new Error("Faltan datos del pedido")
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido no tiene items")
  }
  if (!paymentMethod || !["mercadopago", "cash", "transfer"].includes(paymentMethod)) {
    throw new Error("Elegí un método de pago")
  }

  const restaurantDoc = await getDoc(doc(db, "restaurants", restaurantId))
  if (!restaurantDoc.exists()) {
    throw new Error("Restaurante no encontrado")
  }
  const restaurantData = restaurantDoc.data()
  const ownerId = (restaurantData.ownerId as string) || restaurantId
  const enabledMethods = Array.isArray(restaurantData.paymentMethods)
    ? (restaurantData.paymentMethods as RestaurantPaymentMethod[])
    : (["cash", "transfer"] as RestaurantPaymentMethod[])

  if (!enabledMethods.includes(paymentMethod)) {
    throw new Error("Este restaurante no acepta ese método de pago")
  }

  if (paymentMethod === "mercadopago") {
    // Fuerza token válido del dueño (falla claro si no conectó MP)
    await getMercadoPagoSellerAccessToken(ownerId)
  }

  if (paymentMethod === "transfer") {
    const info = restaurantData.transferInfo || {}
    if (!info.alias && !info.cbu) {
      throw new Error("El restaurante todavía no cargó datos de transferencia")
    }
  }

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

  const baseOrder = {
    id: orderId,
    buyerId,
    buyerEmail,
    restaurantId,
    restaurantName: restaurantData.name || "Restaurante",
    restaurantZone: restaurantData.zone || restaurantData.locationLabel || null,
    restaurantAddress: restaurantData.address || null,
    restaurantOwnerId: ownerId,
    items: validatedItems,
    subtotal,
    deliveryFee: fee,
    total,
    deliveryMode,
    address: address || null,
    phone: phone || null,
    notes: notes || null,
    paymentMethod,
    status: "recibido" as const,
    paymentStatus: "pending" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  return { baseOrder, restaurantData, ownerId, orderId, validatedItems, fee, total, paymentMethod }
}

export async function createFoodOrder(request: Request, body: CreateFoodOrderPayload) {
  const { buyerId } = body
  await requireAuthenticatedUser(request, buyerId)

  const { baseOrder, ownerId, orderId, validatedItems, fee, paymentMethod } = await validateAndBuildOrder(body)

  if (paymentMethod === "cash" || paymentMethod === "transfer") {
    await setDoc(doc(db, "foodOrders", orderId), {
      ...baseOrder,
      preferenceId: null,
      paymentId: null,
    })
    return {
      orderId,
      paymentMethod,
      init_point: null as string | null,
      id: null as string | null,
      transferInfo: paymentMethod === "transfer" ? (await getDoc(doc(db, "restaurants", body.restaurantId))).data()?.transferInfo || null : null,
    }
  }

  // Mercado Pago del restaurante (cuenta del dueño)
  const sellerToken = await getMercadoPagoSellerAccessToken(ownerId)
  const preference = configureMercadoPago(sellerToken)
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
    payer: { email: body.buyerEmail },
    auto_return: "approved",
    metadata: {
      order_id: orderId,
      restaurant_id: body.restaurantId,
      owner_id: ownerId,
      type: "food",
    },
  }

  const result = (await preference.preferences.create(preferenceData)) as { id?: string; init_point?: string }

  await setDoc(doc(db, "foodOrders", orderId), {
    ...baseOrder,
    preferenceId: result.id || null,
    paymentId: null,
  })

  return {
    id: result.id || null,
    init_point: result.init_point || null,
    orderId,
    paymentMethod,
    transferInfo: null,
  }
}

/** Compat: misma firma que antes */
export async function createMercadoPagoFoodPreference(request: Request, body: CreateFoodOrderPayload) {
  return createFoodOrder(request, { ...body, paymentMethod: body.paymentMethod || "mercadopago" })
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
