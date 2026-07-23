import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { notifyFoodOrderStatus } from "@/lib/notifications"
import type { FoodOrder } from "@/types/restaurant"

export function normalizeZone(zone?: string | null): string {
  return (zone || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

/** Match flexible: igualdad o una zona contiene a la otra (ej. "Centro" / "Centro Rosario"). */
export function zonesMatch(a?: string | null, b?: string | null): boolean {
  const za = normalizeZone(a)
  const zb = normalizeZone(b)
  if (!za || !zb) return false
  return za === zb || za.includes(zb) || zb.includes(za)
}

export function isOrderAvailableForPool(order: FoodOrder): boolean {
  return (
    order.status === "listo" &&
    order.paymentStatus === "approved" &&
    order.deliveryMode !== "retiro_en_local" &&
    !order.cadeteId
  )
}

async function enrichRestaurantZones(orders: FoodOrder[]): Promise<FoodOrder[]> {
  const missing = orders.filter((o) => !normalizeZone(o.restaurantZone) && o.restaurantId)
  if (missing.length === 0) return orders

  const uniqueIds = [...new Set(missing.map((o) => o.restaurantId))]
  const zoneByRestaurant = new Map<string, string>()

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "restaurants", id))
        if (snap.exists()) {
          const data = snap.data()
          const zone = (data.zone as string) || (data.locationLabel as string) || ""
          if (zone) zoneByRestaurant.set(id, zone)
        }
      } catch {
        // ignore per-restaurant failures
      }
    })
  )

  return orders.map((o) => {
    if (normalizeZone(o.restaurantZone)) return o
    const zone = zoneByRestaurant.get(o.restaurantId)
    return zone ? { ...o, restaurantZone: zone } : o
  })
}

export function filterOrdersByCadeteZone(orders: FoodOrder[], cadeteZone?: string | null): FoodOrder[] {
  const zone = normalizeZone(cadeteZone)
  // Sin zona en el perfil: mostrar todos (fallback para cuentas viejas)
  if (!zone) return orders
  return orders.filter((o) => zonesMatch(cadeteZone, o.restaurantZone))
}

export async function fetchAvailableFoodOrders(cadeteZone?: string | null): Promise<FoodOrder[]> {
  const snap = await getDocs(query(collection(db, "foodOrders"), where("status", "==", "listo")))
  const base = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
    .filter(isOrderAvailableForPool)
  const enriched = await enrichRestaurantZones(base)
  return filterOrdersByCadeteZone(enriched, cadeteZone).sort((a, b) =>
    String(b.id).localeCompare(String(a.id))
  )
}

/**
 * Escucha pedidos listos en tiempo real y aplica filtros de pool + zona.
 * Usa cache de zonas de restaurante para no re-fetchear en cada snapshot.
 */
export function subscribeAvailableFoodOrders(
  cadeteZone: string | null | undefined,
  onChange: (orders: FoodOrder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const zoneCache = new Map<string, string>()

  return onSnapshot(
    query(collection(db, "foodOrders"), where("status", "==", "listo")),
    async (snap) => {
      try {
        let orders = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
          .filter(isOrderAvailableForPool)

        const needLookup = [
          ...new Set(
            orders
              .filter((o) => !normalizeZone(o.restaurantZone) && o.restaurantId)
              .map((o) => o.restaurantId)
              .filter((id) => !zoneCache.has(id))
          ),
        ]

        await Promise.all(
          needLookup.map(async (id) => {
            try {
              const restSnap = await getDoc(doc(db, "restaurants", id))
              if (restSnap.exists()) {
                const data = restSnap.data()
                const zone = (data.zone as string) || (data.locationLabel as string) || ""
                if (zone) zoneCache.set(id, zone)
              }
            } catch {
              // ignore
            }
          })
        )

        orders = orders.map((o) => {
          if (normalizeZone(o.restaurantZone)) return o
          const zone = zoneCache.get(o.restaurantId)
          return zone ? { ...o, restaurantZone: zone } : o
        })

        onChange(
          filterOrdersByCadeteZone(orders, cadeteZone).sort((a, b) =>
            String(b.id).localeCompare(String(a.id))
          )
        )
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error("Error al escuchar pedidos"))
      }
    },
    (err) => onError?.(err)
  )
}

export async function fetchCadeteDeliveries(cadeteId: string): Promise<FoodOrder[]> {
  const snap = await getDocs(query(collection(db, "foodOrders"), where("cadeteId", "==", cadeteId)))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
    .filter((o) => o.status === "en_camino" || o.status === "entregado")
    .sort((a, b) => {
      if (a.status === "en_camino" && b.status !== "en_camino") return -1
      if (b.status === "en_camino" && a.status !== "en_camino") return 1
      return String(b.id).localeCompare(String(a.id))
    })
}

export async function claimFoodOrder(
  orderId: string,
  cadeteId: string,
  cadeteName: string
): Promise<void> {
  const orderRef = doc(db, "foodOrders", orderId)
  let buyerId = ""
  let restaurantName = ""

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef)
    if (!snap.exists()) {
      throw new Error("El pedido no existe.")
    }

    const data = snap.data() as Omit<FoodOrder, "id">

    if (data.status !== "listo") {
      throw new Error("Este pedido ya no está disponible.")
    }
    if (data.paymentStatus !== "approved") {
      throw new Error("El pago de este pedido no está aprobado.")
    }
    if (data.deliveryMode === "retiro_en_local") {
      throw new Error("Este pedido es retiro en local.")
    }
    if (data.cadeteId) {
      throw new Error("Ya fue tomado por otro cadete.")
    }

    buyerId = data.buyerId
    restaurantName = data.restaurantName

    transaction.update(orderRef, {
      cadeteId,
      cadeteName,
      assignedAt: serverTimestamp(),
      status: "en_camino",
      updatedAt: serverTimestamp(),
    })
  })

  void notifyFoodOrderStatus({
    buyerId,
    orderId,
    status: "en_camino",
    restaurantName,
  })
}

export async function markFoodOrderDelivered(orderId: string, cadeteId: string): Promise<void> {
  const orderRef = doc(db, "foodOrders", orderId)
  let buyerId = ""
  let restaurantName = ""

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef)
    if (!snap.exists()) {
      throw new Error("El pedido no existe.")
    }
    const data = snap.data() as Omit<FoodOrder, "id">
    if (data.cadeteId !== cadeteId) {
      throw new Error("Este pedido no te pertenece.")
    }
    if (data.status !== "en_camino") {
      throw new Error("Solo podés marcar como entregados los pedidos en camino.")
    }
    buyerId = data.buyerId
    restaurantName = data.restaurantName
    transaction.update(orderRef, {
      status: "entregado",
      updatedAt: serverTimestamp(),
    })
  })

  void notifyFoodOrderStatus({
    buyerId,
    orderId,
    status: "entregado",
    restaurantName,
  })
}
