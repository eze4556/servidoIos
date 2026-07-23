"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BellRing,
  CreditCard,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  UtensilsCrossed,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  getNotificationBody,
  isNotificationRead,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications"
import { syncAppointmentNotificationsForUser } from "@/lib/service-appointments"
import type { AppNotification } from "@/types/notifications"

function formatTime(timestamp: any): string {
  if (!timestamp) return ""
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffInHours < 1) return "Hace menos de una hora"
  if (diffInHours < 24) return `Hace ${diffInHours} horas`
  if (diffInHours < 48) return "Ayer"
  return date.toLocaleDateString("es-AR")
}

function iconFor(type: string, shippingStatus?: string) {
  if (type === "shipping" || type === "centralized_shipping") {
    switch (shippingStatus) {
      case "pending":
        return Clock
      case "preparing":
        return Package
      case "shipped":
        return Truck
      case "delivered":
        return CheckCircle
      case "cancelled":
        return XCircle
      default:
        return Package
    }
  }
  if (type === "food_order") return UtensilsCrossed
  if (type === "subscription" || type === "payment") return CreditCard
  if (type === "service") return Calendar
  if (type === "promo") return BellRing
  return AlertCircle
}

export default function NotificationsPage() {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const uid = currentUser?.firebaseUser?.uid

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    void syncAppointmentNotificationsForUser(uid).catch(() => undefined)

    // Una sola suscripción; ordenamos en cliente (evita crash de listeners anidados)
    const q = query(collection(db, "notifications"), where("userId", "==", uid), limit(80))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))
        list.sort((a, b) => {
          const at = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
          const bt = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
          return bt - at
        })
        setItems(list)
        setLoading(false)
      },
      (err) => {
        console.warn("notifications listener:", err)
        setItems([])
        setLoading(false)
      }
    )

    return () => unsub()
  }, [uid])

  const unreadCount = useMemo(() => items.filter((n) => !isNotificationRead(n)).length, [items])

  const handleOpen = async (n: AppNotification) => {
    if (!isNotificationRead(n)) {
      try {
        await markNotificationRead(n.id)
      } catch {
        /* ignore */
      }
    }
  }

  const handleMarkAll = async () => {
    if (!uid || unreadCount === 0) return
    setMarkingAll(true)
    try {
      await markAllNotificationsRead(uid)
    } finally {
      setMarkingAll(false)
    }
  }

  if (!uid) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="mb-4 text-3xl font-bold">Notificaciones</h1>
        <p className="text-muted-foreground">Iniciá sesión para ver tus avisos.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount} sin leer
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" disabled={markingAll} onClick={() => void handleMarkAll()}>
            Marcar todas leídas
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Cargando notificaciones...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground">No tenés notificaciones todavía.</p>
      ) : (
        <div className="mx-auto grid max-w-2xl gap-3">
          {items.map((n) => {
            const unread = !isNotificationRead(n)
            const body = getNotificationBody(n)
            const meta = (n.meta || {}) as Record<string, unknown>
            const shippingStatus = String(
              (n as any).shippingStatus || meta.shippingStatus || ""
            )
            const Icon = iconFor(String(n.type), shippingStatus)
            const href = n.link || "/dashboard/buyer"

            return (
              <Card
                key={n.id}
                className={`transition-shadow hover:shadow-md ${unread ? "ring-2 ring-servido-200" : ""}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-servido-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-snug">{n.title}</h3>
                      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-servido-600" />}
                    </div>
                    {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
                    <Link
                      href={href}
                      className="mt-2 inline-block text-sm font-medium text-servido-700 hover:underline"
                      onClick={() => void handleOpen(n)}
                    >
                      Ver detalle
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
