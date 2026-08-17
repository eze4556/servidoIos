import { auth as adminAuth, db as adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { configureMercadoPago, getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import { getMercadoPagoSellerAccessToken } from "@/lib/mercadopago-oauth"
import { mapMenuItemDoc } from "@/lib/restaurant-menu"
import {
  mapMenuPromotionDoc,
  resolveComboPromotion,
  resolveMenuItemSelections,
  type SelectionInput,
} from "@/lib/restaurant-options"
import {
  fetchDeliveryPricing,
  quoteDeliveryAmounts,
  quotePickupCommission,
} from "@/lib/delivery-pricing"
import { hasValidCoordinates } from "@/lib/geo"
import type {
  DeliveryMode,
  FoodOrderItem,
  RestaurantPaymentMethod,
} from "@/types/restaurant"

export type CreateFoodOrderItemPayload = {
  menuItemId: string
  quantity: number
  selections?: SelectionInput[]
  promotionId?: string
}

export type CreateFoodOrderPayload = {
  restaurantId: string
  buyerId: string
  buyerEmail: string
  items: CreateFoodOrderItemPayload[]
  deliveryMode: DeliveryMode
  address?: string
  phone?: string
  notes?: string
  /** Ignorado en servidor; el fee se calcula por km */
  deliveryFee?: number
  paymentMethod: RestaurantPaymentMethod
  deliveryLat?: number
  deliveryLng?: number
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

function isPickupMode(deliveryMode: DeliveryMode) {
  return deliveryMode === "retiro_en_local"
}

async function validateAndBuildOrder(body: CreateFoodOrderPayload) {
  const {
    restaurantId,
    buyerId,
    buyerEmail,
    items,
    deliveryMode,
    address,
    phone,
    notes,
    paymentMethod,
    deliveryLat,
    deliveryLng,
  } = body

  if (!restaurantId || !buyerId || !buyerEmail) {
    throw new Error("Faltan datos del pedido")
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido no tiene items")
  }
  if (!paymentMethod || !["mercadopago", "cash", "transfer"].includes(paymentMethod)) {
    throw new Error("Elegí un método de pago")
  }

  // Delivery: solo Mercado Pago. Retiro: MP o efectivo (sin transferencia).
  const pickup = isPickupMode(deliveryMode)
  if (!pickup && paymentMethod !== "mercadopago") {
    throw new Error("El delivery solo se paga con Mercado Pago")
  }
  if (pickup && paymentMethod === "transfer") {
    throw new Error("La transferencia no está disponible. Usá Mercado Pago o efectivo.")
  }

  const restaurantDoc = await adminDb.collection("restaurants").doc(restaurantId).get()
  if (!restaurantDoc.exists) {
    throw new Error("Restaurante no encontrado")
  }
  const restaurantData = restaurantDoc.data()!
  const ownerId = (restaurantData.ownerId as string) || restaurantId

  const ownerSnap = await adminDb.collection("users").doc(ownerId).get()
  if (!ownerSnap.exists) {
    throw new Error("Dueño del restaurante no encontrado")
  }

  // Retiro en efectivo: ok sin MP. Delivery y retiro MP: exigir cuenta MP del dueño.
  if (paymentMethod === "mercadopago") {
    await getMercadoPagoSellerAccessToken(ownerId)
  }

  // Retiro cash: el restaurante debe tener cash habilitado (o permitir por defecto en retiro)
  if (pickup && paymentMethod === "cash") {
    const enabledMethods = Array.isArray(restaurantData.paymentMethods)
      ? (restaurantData.paymentMethods as RestaurantPaymentMethod[])
      : (["cash", "mercadopago"] as RestaurantPaymentMethod[])
    if (!enabledMethods.includes("cash") && !enabledMethods.includes("mercadopago")) {
      // Si solo tenía transfer, igual permitir cash en retiro (nuevo modelo)
    }
  }

  const coords = restaurantData.coordinates as { latitude?: number; longitude?: number } | null | undefined
  const restaurantLat = Number(coords?.latitude)
  const restaurantLng = Number(coords?.longitude)

  if (!pickup) {
    if (!address?.trim()) {
      throw new Error("Ingresá la dirección de entrega")
    }
    if (!hasValidCoordinates(restaurantLat, restaurantLng)) {
      throw new Error("El restaurante no tiene ubicación cargada. Pedile que actualice su perfil.")
    }
    if (!hasValidCoordinates(deliveryLat, deliveryLng)) {
      throw new Error("Seleccioná una ubicación válida para la entrega")
    }
  }

  const validatedItems: FoodOrderItem[] = []
  let subtotal = 0

  for (const item of items) {
    const quantity = Number(item.quantity) || 0
    if (quantity <= 0) {
      throw new Error("Cantidad inválida")
    }

    if (item.promotionId) {
      const promoDoc = await adminDb.collection("menuPromotions").doc(item.promotionId).get()
      if (!promoDoc.exists) {
        throw new Error(`Combo no encontrado: ${item.promotionId}`)
      }
      const promotion = mapMenuPromotionDoc(promoDoc.id, promoDoc.data() as Record<string, unknown>)
      if (promotion.restaurantId !== restaurantId) {
        throw new Error("El combo no pertenece a este restaurante")
      }
      const resolved = resolveComboPromotion(promotion)
      const lineTotal = roundMoney(resolved.unitPrice * quantity)
      subtotal += lineTotal
      validatedItems.push({
        menuItemId: `promo_${promotion.id}`,
        name: resolved.displayName,
        price: resolved.unitPrice,
        quantity,
        basePrice: resolved.unitPrice,
        lineKey: resolved.lineKey,
        promotionId: promotion.id,
        selections: [
          {
            groupId: "combo",
            groupName: "Incluye",
            optionId: "included",
            optionName: resolved.includedSummary,
            priceDelta: 0,
          },
        ],
      })
      continue
    }

    const menuDoc = await adminDb.collection("menuItems").doc(item.menuItemId).get()
    if (!menuDoc.exists) {
      throw new Error(`Plato no encontrado: ${item.menuItemId}`)
    }
    const menuItem = mapMenuItemDoc(menuDoc.id, menuDoc.data() as Record<string, unknown>)
    if (menuItem.restaurantId !== restaurantId) {
      throw new Error("El plato no pertenece a este restaurante")
    }
    if (menuItem.available === false) {
      throw new Error(`El plato ${menuItem.name} no está disponible`)
    }

    const resolved = resolveMenuItemSelections(menuItem, item.selections || [])
    const lineTotal = roundMoney(resolved.unitPrice * quantity)
    subtotal += lineTotal
    validatedItems.push({
      menuItemId: menuItem.id,
      name: resolved.displayName,
      price: resolved.unitPrice,
      quantity,
      basePrice: Number(menuItem.price) || 0,
      selections: resolved.selections.length ? resolved.selections : undefined,
      lineKey: resolved.lineKey,
    })
  }

  subtotal = roundMoney(subtotal)
  const pricing = await fetchDeliveryPricing()

  const quote = pickup
    ? quotePickupCommission(subtotal, pricing)
    : quoteDeliveryAmounts({
        subtotal,
        restaurantLat,
        restaurantLng,
        deliveryLat: Number(deliveryLat),
        deliveryLng: Number(deliveryLng),
        pricing,
      })

  const fee = quote.deliveryFee
  const total = roundMoney(subtotal + fee)
  const orderId = `food_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // Retiro cash → pending hasta liquidación martes. MP → collected al aprobar el pago.

  const baseOrder = {
    id: orderId,
    buyerId,
    buyerEmail,
    restaurantId,
    restaurantName: restaurantData.name || "Restaurante",
    restaurantZone: restaurantData.zone || restaurantData.locationLabel || null,
    restaurantAddress: restaurantData.address || null,
    restaurantOwnerId: ownerId,
    restaurantLat: hasValidCoordinates(restaurantLat, restaurantLng) ? restaurantLat : null,
    restaurantLng: hasValidCoordinates(restaurantLat, restaurantLng) ? restaurantLng : null,
    deliveryLat: !pickup && hasValidCoordinates(deliveryLat, deliveryLng) ? Number(deliveryLat) : null,
    deliveryLng: !pickup && hasValidCoordinates(deliveryLat, deliveryLng) ? Number(deliveryLng) : null,
    distanceKm: quote.distanceKm,
    cadetePayAmount: quote.cadetePayAmount,
    servidoCommission: quote.servidoCommission,
    restaurantNetAmount: quote.restaurantNetAmount,
    marketplaceFee: quote.marketplaceFee,
    servidoDeliveryMargin: quote.servidoDeliveryMargin,
    servidoPayoutAmount: quote.cadetePayAmount,
    commissionStatus: "pending" as const,
    cadetePayoutStatus: "none" as const,
    cadetePayoutBatchId: null,
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
    paymentStatus: paymentMethod === "cash" ? ("approved" as const) : ("pending" as const),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  return {
    baseOrder,
    restaurantData,
    ownerId,
    orderId,
    validatedItems,
    fee,
    total,
    paymentMethod,
    marketplaceFee: quote.marketplaceFee,
    pickup,
  }
}

export async function createFoodOrder(request: Request, body: CreateFoodOrderPayload) {
  const { buyerId } = body
  await requireAuthenticatedUser(request, buyerId)

  const {
    baseOrder,
    ownerId,
    orderId,
    validatedItems,
    fee,
    paymentMethod,
    marketplaceFee,
    pickup,
  } = await validateAndBuildOrder(body)

  // Retiro en efectivo: sin MP, comisión pending
  if (paymentMethod === "cash") {
    if (!pickup) {
      throw new Error("El delivery solo se paga con Mercado Pago")
    }
    await adminDb.collection("foodOrders").doc(orderId).set({
      ...baseOrder,
      preferenceId: null,
      paymentId: null,
      commissionStatus: "pending",
      paymentStatus: "approved",
    })
    return {
      orderId,
      paymentMethod,
      init_point: null as string | null,
      id: null as string | null,
      transferInfo: null,
    }
  }

  // Mercado Pago del restaurante (cuenta del dueño)
  const sellerToken = await getMercadoPagoSellerAccessToken(ownerId)
  const preference = configureMercadoPago(sellerToken)
  const mpItems = validatedItems.map((item) => ({
    id: item.menuItemId,
    title: item.name.slice(0, 120),
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

  // Comisión 12% (+ envío en delivery) → Servido vía marketplace_fee
  let mpFee = roundMoney(marketplaceFee)
  const orderTotal = roundMoney((baseOrder as { total: number }).total)
  if (mpFee >= orderTotal) {
    mpFee = Math.max(0, roundMoney(orderTotal - 0.01))
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
      marketplace_fee: mpFee,
      food_commission_rate: 0.12,
    },
  }

  if (mpFee > 0) {
    preferenceData.marketplace_fee = mpFee
  }

  const result = (await preference.preferences.create(preferenceData)) as { id?: string; init_point?: string }

  await adminDb.collection("foodOrders").doc(orderId).set({
    ...baseOrder,
    preferenceId: result.id || null,
    paymentId: null,
    marketplaceFee: mpFee,
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
  const orderRef = adminDb.collection("foodOrders").doc(orderId)
  const orderSnap = await orderRef.get()
  if (!orderSnap.exists) return false

  const data = orderSnap.data()!
  const isDelivery =
    data.deliveryMode === "delivery_propio" ||
    (data.deliveryMode === "ambos" && Number(data.deliveryFee) > 0)

  await orderRef.update({
    paymentStatus,
    paymentId: paymentId || null,
    updatedAt: FieldValue.serverTimestamp(),
    ...(paymentStatus === "approved"
      ? {
          status: "recibido",
          commissionStatus: "collected",
        }
      : {}),
    ...(paymentStatus === "cancelled" || paymentStatus === "rejected" ? { status: "cancelado" } : {}),
  })

  // Silenciar unused — isDelivery se usará cuando accrue al entregar
  void isDelivery
  return true
}
