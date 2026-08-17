import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { FoodOrder } from "@/types/restaurant"
import type { RestaurantCommissionBatch, CadetePayoutBatch } from "@/types/delivery-settlements"

/** Período de liquidación: martes 00:00 → lunes 23:59 (hora local). */
export function getTuesdaySettlementWindow(now = new Date()): { start: Date; end: Date; nextTuesday: Date } {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=dom … 2=mar
  // Días desde el martes más reciente (incluye hoy si es martes)
  const daysSinceTuesday = (day + 5) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - daysSinceTuesday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  const nextTuesday = new Date(start)
  nextTuesday.setDate(start.getDate() + 7)

  // Si hoy es martes y aún no liquidamos, el período actual empezó hace 7 días
  // Para acumulado "a liquidar el próximo martes": pedidos desde el martes pasado inclusive
  return { start, end, nextTuesday }
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate()
  }
  if (typeof value === "number") return new Date(value)
  if (typeof value === "string") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Suma cadetePayAmount de pedidos entregados con status accrued en la ventana actual. */
export async function fetchCadeteAccruedPayout(cadeteId: string): Promise<{
  amount: number
  orderCount: number
  nextTuesday: Date
}> {
  const { start, nextTuesday } = getTuesdaySettlementWindow()
  const snap = await getDocs(
    query(collection(db, "foodOrders"), where("cadeteId", "==", cadeteId))
  )

  let amount = 0
  let orderCount = 0
  for (const docSnap of snap.docs) {
    const order = docSnap.data() as FoodOrder
    if (order.status !== "entregado" || order.cadetePayoutStatus !== "accrued") continue
    const updated = toDate(order.updatedAt) || toDate(order.assignedAt)
    if (updated && updated < start) continue
    const pay = Number(order.servidoPayoutAmount ?? order.cadetePayAmount) || 0
    if (pay <= 0) continue
    amount += pay
    orderCount += 1
  }

  return { amount: Math.round(amount * 100) / 100, orderCount, nextTuesday }
}

/** Comisiones pendientes de retiros en efectivo del restaurante. */
export async function fetchRestaurantPendingCommissions(restaurantId: string): Promise<{
  amount: number
  orderCount: number
}> {
  const snap = await getDocs(
    query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId))
  )

  let amount = 0
  let orderCount = 0
  for (const docSnap of snap.docs) {
    const order = docSnap.data() as FoodOrder
    if (order.paymentMethod !== "cash") continue
    const commission = Number(order.servidoCommission) || 0
    if (commission <= 0) continue
    amount += commission
    orderCount += 1
  }

  return { amount: Math.round(amount * 100) / 100, orderCount }
}

export async function fetchRestaurantCommissionBatches(restaurantId: string): Promise<RestaurantCommissionBatch[]> {
  const snap = await getDocs(
    query(collection(db, "restaurantCommissionBatches"), where("restaurantId", "==", restaurantId))
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as RestaurantCommissionBatch))
    .sort((a, b) => {
      const ta = String((a as { weekStart?: string }).weekStart || a.id)
      const tb = String((b as { weekStart?: string }).weekStart || b.id)
      return tb.localeCompare(ta)
    })
}

export async function fetchCadetePayoutBatches(cadeteId: string): Promise<CadetePayoutBatch[]> {
  const snap = await getDocs(
    query(collection(db, "cadetePayoutBatches"), where("cadeteId", "==", cadeteId))
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as CadetePayoutBatch))
    .sort((a, b) => {
      const ta = String((a as { weekStart?: string }).weekStart || a.id)
      const tb = String((b as { weekStart?: string }).weekStart || b.id)
      return tb.localeCompare(ta)
    })
}
