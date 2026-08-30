import { db } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"

function normalizeZone(zone: unknown): string {
  return String(zone || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

function zonesMatch(left: unknown, right: unknown): boolean {
  const a = normalizeZone(left)
  const b = normalizeZone(right)
  if (!a || !b) return true
  return a === b || a.includes(b) || b.includes(a)
}

/**
 * Avisa a cadetes activos cuando un pedido entra al pool.
 * La dedupeKey impide que listo → despachado o un reintento dupliquen el aviso.
 */
export async function notifyFoodOrderAvailableToCadetes(orderId: string): Promise<number> {
  const orderSnap = await db.collection("foodOrders").doc(orderId).get()
  if (!orderSnap.exists) return 0
  const order = orderSnap.data() || {}
  if (
    !["listo", "despachado"].includes(String(order.status)) ||
    order.paymentStatus !== "approved" ||
    order.deliveryMode === "retiro_en_local" ||
    order.cadeteId
  ) {
    return 0
  }

  const users = await db.collection("users").where("role", "==", "cadete").get()
  const cadeteIds = users.docs
    .filter((doc) => {
      const data = doc.data()
      return (
        data.isActive === true &&
        data.status === "approved" &&
        zonesMatch(data.zone, order.restaurantZone)
      )
    })
    .map((doc) => doc.id)

  // Limita concurrencia para no disparar cientos de escrituras y envíos a la
  // vez en una función serverless.
  for (let offset = 0; offset < cadeteIds.length; offset += 20) {
    await Promise.all(
      cadeteIds.slice(offset, offset + 20).map((cadeteId) =>
        createNotificationAdmin({
          userId: cadeteId,
          type: "food_order",
          title: "Nuevo pedido disponible",
          body: `Hay un envío disponible${order.restaurantName ? ` en ${order.restaurantName}` : ""}.`,
          link: "/dashboard/cadete",
          dedupeKey: `food_order_available_${orderId}_${cadeteId}`,
          meta: { orderId },
        })
      )
    )
  }

  return cadeteIds.length
}
