import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AppNotification, CreateAppNotificationInput } from "@/types/notifications"

export function isNotificationRead(n: Pick<AppNotification, "read" | "isRead">): boolean {
  return Boolean(n.read ?? n.isRead)
}

export function getNotificationBody(n: Pick<AppNotification, "body" | "description">): string {
  return String(n.body || n.description || "").trim()
}

/**
 * Crea una notificación in-app (cliente).
 * Si viene `dedupeKey` y ya existe una igual para el usuario, no duplica.
 * Preferí `dispatchAppNotifications` para avisar a otro usuario (usa Admin API).
 */
export async function createAppNotification(input: CreateAppNotificationInput): Promise<string | null> {
  const userId = String(input.userId || "").trim()
  const title = String(input.title || "").trim()
  const body = String(input.body || "").trim()
  if (!userId || !title || !body) return null

  const dedupeKey = input.dedupeKey ? String(input.dedupeKey).trim() : ""
  if (dedupeKey) {
    try {
      const existing = await getDocs(
        query(
          collection(db, "notifications"),
          where("userId", "==", userId),
          where("dedupeKey", "==", dedupeKey),
          limit(1)
        )
      )
      if (!existing.empty) return existing.docs[0].id
    } catch (err) {
      // Índice faltante u otra falla: seguimos e intentamos crear
      console.warn("createAppNotification dedupe skip:", err)
    }
  }

  try {
    const ref = await addDoc(collection(db, "notifications"), {
      userId,
      type: input.type || "system",
      title,
      body,
      description: body,
      link: input.link || null,
      read: false,
      isRead: false,
      dedupeKey: dedupeKey || null,
      meta: input.meta || null,
      createdAt: serverTimestamp(),
    })
    return ref.id
  } catch (err) {
    console.error("createAppNotification failed:", err)
    return null
  }
}

/**
 * Crea una o más notificaciones vía API (Admin SDK).
 * Sirve para avisar al otro usuario sin chocar con reglas de Firestore.
 */
export async function dispatchAppNotifications(items: CreateAppNotificationInput[]): Promise<string[]> {
  const list = items.filter((i) => i.userId && i.title && i.body)
  if (list.length === 0) return []

  try {
    const { auth } = await import("@/lib/firebase")
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error("Sin sesión")

    const res = await fetch("/api/notifications/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notifications: list }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${res.status}`)
    }

    const data = (await res.json()) as { ids?: string[] }
    return Array.isArray(data.ids) ? data.ids : []
  } catch (err) {
    console.warn("dispatchAppNotifications API failed, fallback client:", err)
    const ids: string[] = []
    for (const item of list) {
      const id = await createAppNotification(item)
      if (id) ids.push(id)
    }
    return ids
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), {
    read: true,
    isRead: true,
  })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false), limit(100))
  )
  // Compat: también las que solo tienen isRead:false
  const snapLegacy = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", userId), where("isRead", "==", false), limit(100))
  )
  const ids = new Set([...snap.docs, ...snapLegacy.docs].map((d) => d.id))
  await Promise.all(
    Array.from(ids).map((id) =>
      updateDoc(doc(db, "notifications", id), { read: true, isRead: true }).catch(() => undefined)
    )
  )
}

export function subscribeUnreadNotificationCount(
  userId: string,
  onChange: (count: number) => void
): Unsubscribe {
  // Una sola suscripción (sin orderBy): evita crash de Firestore al encadenar listeners
  const q = query(collection(db, "notifications"), where("userId", "==", userId), limit(50))

  return onSnapshot(
    q,
    (snap) => {
      const count = snap.docs.filter((d) => !isNotificationRead(d.data() as AppNotification)).length
      onChange(count)
    },
    (err) => {
      console.warn("subscribeUnreadNotificationCount:", err)
      onChange(0)
    }
  )
}

export async function notifySubscriptionReminder(params: {
  userId: string
  daysRemaining: number
  planLabel?: string
  link?: string
}): Promise<void> {
  const days = Math.max(0, Math.floor(params.daysRemaining))
  if (days > 7) return

  const today = new Date().toISOString().slice(0, 10)
  const title =
    days <= 0
      ? "Tu suscripción venció"
      : days === 1
        ? "Tu suscripción vence mañana"
        : `Tu suscripción vence en ${days} días`

  const body =
    days <= 0
      ? "Renovala para seguir publicando y recibiendo pedidos."
      : `Te quedan ${days} día${days === 1 ? "" : "s"} de acceso${
          params.planLabel ? ` (${params.planLabel})` : ""
        }. Podés renovar desde tu panel.`

  await createAppNotification({
    userId: params.userId,
    type: "subscription",
    title,
    body,
    link: params.link || "/dashboard/seller",
    dedupeKey: `subscription_reminder_${params.userId}_${today}`,
    meta: { daysRemaining: days },
  })
}

export async function notifyFoodOrderStatus(params: {
  buyerId: string
  orderId: string
  status: string
  restaurantName?: string
}): Promise<void> {
  const buyerId = String(params.buyerId || "").trim()
  if (!buyerId) return

  const labels: Record<string, string> = {
    recibido: "Pedido recibido",
    en_preparacion: "Tu pedido se está preparando",
    listo: "Tu pedido está listo",
    en_camino: "Tu pedido va en camino",
    entregado: "Pedido entregado",
    cancelado: "Pedido cancelado",
  }
  const title = labels[params.status] || "Actualización de tu pedido"
  const place = params.restaurantName ? ` en ${params.restaurantName}` : ""
  const body =
    params.status === "entregado"
      ? `Tu comida${place} ya fue entregada. ¡Buen provecho!`
      : `${title}${place}.`

  await createAppNotification({
    userId: buyerId,
    type: "food_order",
    title,
    body,
    link: "/dashboard/buyer",
    dedupeKey: `food_order_${params.orderId}_${params.status}`,
    meta: { orderId: params.orderId, status: params.status },
  })
}
