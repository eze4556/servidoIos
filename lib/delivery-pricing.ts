import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { distanceKm, hasValidCoordinates } from "@/lib/geo"

/** Valores iniciales confirmados en propuesta v1.3 */
export const DEFAULT_DELIVERY_PRICING = {
  customerRatePerKm: 1000,
  cadeteRatePerKm: 800,
  minDeliveryFee: 1500,
  maxDeliveryFee: 15000,
  minCadetePay: 1200,
  foodCommissionRate: 0.12,
  distanceFactor: 1.25,
} as const

export type DeliveryPricing = {
  customerRatePerKm: number
  cadeteRatePerKm: number
  minDeliveryFee: number
  maxDeliveryFee: number
  minCadetePay: number
  foodCommissionRate: number
  distanceFactor: number
}

export const DELIVERY_PRICING_DOC = "settings/deliveryPricing"

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

function roundKm(km: number) {
  return Math.round(km * 100) / 100
}

function asPositiveNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function parseDeliveryPricing(data?: Record<string, unknown> | null): DeliveryPricing {
  const d = DEFAULT_DELIVERY_PRICING
  if (!data) return { ...d }
  return {
    customerRatePerKm: asPositiveNumber(data.customerRatePerKm, d.customerRatePerKm),
    cadeteRatePerKm: asPositiveNumber(data.cadeteRatePerKm, d.cadeteRatePerKm),
    minDeliveryFee: asPositiveNumber(data.minDeliveryFee, d.minDeliveryFee),
    maxDeliveryFee: asPositiveNumber(data.maxDeliveryFee, d.maxDeliveryFee),
    minCadetePay: asPositiveNumber(data.minCadetePay, d.minCadetePay),
    foodCommissionRate: asPositiveNumber(data.foodCommissionRate, d.foodCommissionRate),
    distanceFactor: asPositiveNumber(data.distanceFactor, d.distanceFactor) || d.distanceFactor,
  }
}

export async function fetchDeliveryPricing(): Promise<DeliveryPricing> {
  try {
    const snap = await getDoc(doc(db, "settings", "deliveryPricing"))
    if (!snap.exists()) return { ...DEFAULT_DELIVERY_PRICING }
    return parseDeliveryPricing(snap.data() as Record<string, unknown>)
  } catch {
    return { ...DEFAULT_DELIVERY_PRICING }
  }
}

/** Distancia en km con factor de calles (Haversine × factor). */
export function roadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  factor = DEFAULT_DELIVERY_PRICING.distanceFactor
): number {
  if (!hasValidCoordinates(lat1, lon1) || !hasValidCoordinates(lat2, lon2)) return 0
  return roundKm(distanceKm(lat1, lon1, lat2, lon2) * factor)
}

export type DeliveryQuote = {
  distanceKm: number
  deliveryFee: number
  cadetePayAmount: number
  servidoCommission: number
  restaurantNetAmount: number
  marketplaceFee: number
  servidoDeliveryMargin: number
}

export function quoteDeliveryAmounts(params: {
  subtotal: number
  restaurantLat: number
  restaurantLng: number
  deliveryLat: number
  deliveryLng: number
  pricing?: DeliveryPricing
  /** Si es retiro, fee y pago cadete = 0 */
  isPickup?: boolean
}): DeliveryQuote {
  const pricing = params.pricing || DEFAULT_DELIVERY_PRICING
  const subtotal = roundMoney(Math.max(0, params.subtotal))
  const servidoCommission = roundMoney(subtotal * pricing.foodCommissionRate)
  const restaurantNetAmount = roundMoney(subtotal - servidoCommission)

  if (params.isPickup) {
    return {
      distanceKm: 0,
      deliveryFee: 0,
      cadetePayAmount: 0,
      servidoCommission,
      restaurantNetAmount,
      marketplaceFee: servidoCommission,
      servidoDeliveryMargin: 0,
    }
  }

  const distanceKmValue = roadDistanceKm(
    params.restaurantLat,
    params.restaurantLng,
    params.deliveryLat,
    params.deliveryLng,
    pricing.distanceFactor
  )

  let deliveryFee = roundMoney(distanceKmValue * pricing.customerRatePerKm)
  deliveryFee = Math.max(pricing.minDeliveryFee, Math.min(pricing.maxDeliveryFee, deliveryFee))

  let cadetePayAmount = roundMoney(distanceKmValue * pricing.cadeteRatePerKm)
  cadetePayAmount = Math.max(pricing.minCadetePay, cadetePayAmount)

  // Si por mínimos el cadete cobrara más que el envío, alinear
  if (cadetePayAmount > deliveryFee) {
    cadetePayAmount = deliveryFee
  }

  const marketplaceFee = roundMoney(servidoCommission + deliveryFee)
  const servidoDeliveryMargin = roundMoney(deliveryFee - cadetePayAmount)

  return {
    distanceKm: distanceKmValue,
    deliveryFee,
    cadetePayAmount,
    servidoCommission,
    restaurantNetAmount,
    marketplaceFee,
    servidoDeliveryMargin,
  }
}

export function quotePickupCommission(subtotal: number, pricing?: DeliveryPricing): DeliveryQuote {
  return quoteDeliveryAmounts({
    subtotal,
    restaurantLat: 0,
    restaurantLng: 0,
    deliveryLat: 0,
    deliveryLng: 0,
    pricing,
    isPickup: true,
  })
}
