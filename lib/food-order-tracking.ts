import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { notifyFoodOrderStatus } from "@/lib/notifications"
import type { FoodOrder, FoodOrderStatus } from "@/types/restaurant"

/** Estados visibles para el comprador (comida / delivery). */
export const FOOD_ORDER_TRACKING_STATUSES: FoodOrderStatus[] = [
  "confirmado",
  "en_preparacion",
  "listo",
  "despachado",
  "en_camino",
  "llegando",
  "afuera",
  "entregado",
  "cancelado",
]

const RESTAURANT_DELIVERY_FLOW: FoodOrderStatus[] = [
  "confirmado",
  "en_preparacion",
  "listo",
  "despachado",
]

const RESTAURANT_PICKUP_FLOW: FoodOrderStatus[] = ["confirmado", "en_preparacion", "listo", "entregado"]

const CADETE_FLOW: FoodOrderStatus[] = ["en_camino", "llegando", "afuera", "entregado"]

function normalizeStatus(status: FoodOrderStatus): FoodOrderStatus {
  return status === "recibido" ? "confirmado" : status
}

function nextInFlow(current: FoodOrderStatus, flow: FoodOrderStatus[]): FoodOrderStatus | null {
  const cur = normalizeStatus(current)
  const idx = flow.indexOf(cur)
  if (idx === -1 || idx >= flow.length - 1) return null
  return flow[idx + 1]
}

export function getNextFoodOrderStatus(
  order: Pick<FoodOrder, "status" | "deliveryMode">,
  actor: "restaurant" | "cadete"
): FoodOrderStatus | null {
  const status = normalizeStatus(order.status)
  if (status === "cancelado" || status === "entregado") return null

  if (actor === "restaurant") {
    const flow = order.deliveryMode === "retiro_en_local" ? RESTAURANT_PICKUP_FLOW : RESTAURANT_DELIVERY_FLOW
    return nextInFlow(status, flow)
  }

  if (actor === "cadete") {
    if (order.deliveryMode === "retiro_en_local") return null
    return nextInFlow(status, CADETE_FLOW)
  }

  return null
}

export function canSetFoodOrderStatus(
  order: Pick<FoodOrder, "status" | "deliveryMode" | "cadeteId">,
  next: FoodOrderStatus,
  actor: "restaurant" | "cadete"
): boolean {
  const target = normalizeStatus(next)
  const current = normalizeStatus(order.status)
  if (target === current) return true

  if (actor === "restaurant") {
    const flow = order.deliveryMode === "retiro_en_local" ? RESTAURANT_PICKUP_FLOW : RESTAURANT_DELIVERY_FLOW
    const curIdx = flow.indexOf(current)
    const nextIdx = flow.indexOf(target)
    return curIdx >= 0 && nextIdx === curIdx + 1
  }

  if (actor === "cadete") {
    const cadeteIdx = CADETE_FLOW.indexOf(target)
    if (cadeteIdx === -1) return false
    if (target === "en_camino" && (current === "listo" || current === "despachado")) return true
    const curIdx = CADETE_FLOW.indexOf(current)
    return curIdx >= 0 && cadeteIdx === curIdx + 1
  }

  return false
}

export async function setFoodOrderStatus(params: {
  orderId: string
  status: FoodOrderStatus
  actor: "restaurant" | "cadete"
  actorUserId: string
}): Promise<void> {
  const orderRef = doc(db, "foodOrders", params.orderId)
  const snap = await getDoc(orderRef)
  if (!snap.exists()) throw new Error("El pedido no existe.")

  const order = { id: snap.id, ...snap.data() } as FoodOrder
  const nextStatus = params.status === "recibido" ? "confirmado" : params.status

  if (!canSetFoodOrderStatus(order, nextStatus, params.actor)) {
    throw new Error("No podés avanzar a ese estado todavía.")
  }

  if (params.actor === "cadete" && order.cadeteId && order.cadeteId !== params.actorUserId) {
    throw new Error("Este pedido no te pertenece.")
  }

  await updateDoc(orderRef, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
    ...(nextStatus === "entregado" &&
    params.actor === "cadete" &&
    Number(order.cadetePayAmount) > 0
      ? {
          cadetePayoutStatus: "accrued",
          servidoPayoutAmount: Number(order.cadetePayAmount) || 0,
        }
      : {}),
  })

  void notifyFoodOrderStatus({
    buyerId: order.buyerId,
    orderId: order.id,
    status: nextStatus,
    restaurantName: order.restaurantName,
  })
}
