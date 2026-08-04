"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  isNotificationRead,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications"
import { resolveAppNotificationDisplay } from "@/lib/i18n/resolve-app-notification"
import { isServidoOfficialNotification } from "@/lib/servido-official"
import { ServidoOfficialAvatar } from "@/components/chat/servido-official-avatar"
import { syncAppointmentNotificationsForUser } from "@/lib/service-appointments"
import type { AppNotification } from "@/types/notifications"

function normalizeNotificationLink(link: unknown): string | null {
  if (typeof link !== "string") return null
  const trimmed = link.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed
  }
  return `/${trimmed.replace(/^\//, "")}`
}

function formatNotificationTime(
  timestamp: unknown,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  locale: string
): string {
  if (!timestamp) return ""
  const ts = timestamp as { toDate?: () => Date; seconds?: number }
  const date = ts.toDate ? ts.toDate() : new Date(timestamp as string | number)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffInHours < 1) return t("timeLessThanHour")
  if (diffInHours < 24) return t("timeHoursAgo", { count: diffInHours })
  if (diffInHours < 48) return t("timeYesterday")
  return date.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "es-AR")
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
  const t = useTranslations("notifications")
  const tApp = useTranslations("appNotifications")
  const tAuth = useTranslations("auth")
  const locale = useLocale()
  const router = useRouter()
  const { currentUser } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<AppNotification | null>(null)
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

  const handleViewDetail = (n: AppNotification) => {
    const target = normalizeNotificationLink(n.link)
    void handleOpen(n)
    if (target) {
      router.push(target)
      return
    }
    setDetailItem(n)
    setDetailOpen(true)
  }

  const detailDisplay = useMemo(() => {
    if (!detailItem) return null
    return resolveAppNotificationDisplay(detailItem, tApp, locale)
  }, [detailItem, tApp, locale])

  const detailLink = detailItem ? normalizeNotificationLink(detailItem.link) : null

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
        <h1 className="mb-4 text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("loginHint")}</p>
        <Button asChild className="mt-4">
          <Link href="/login">{tAuth("loginButton")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("unreadCount", { count: unreadCount })}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" disabled={markingAll} onClick={() => void handleMarkAll()}>
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mx-auto grid max-w-2xl gap-3">
          {items.map((n) => {
            const unread = !isNotificationRead(n)
            const display = resolveAppNotificationDisplay(n, tApp, locale)
            const meta = (n.meta || {}) as Record<string, unknown>
            const shippingStatus = String(
              (n as any).shippingStatus || meta.shippingStatus || ""
            )
            const Icon = iconFor(String(n.type), shippingStatus)
            const servidoOfficial = isServidoOfficialNotification(meta)

            return (
              <Card
                key={n.id}
                className={`transition-shadow hover:shadow-md ${unread ? "ring-2 ring-servido-200" : ""}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {servidoOfficial ? (
                    <ServidoOfficialAvatar size={28} className="mt-0.5 shrink-0" />
                  ) : (
                    <Icon className="mt-0.5 h-6 w-6 shrink-0 text-servido-700" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-snug">{display.title}</h3>
                      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-servido-600" />}
                    </div>
                    {display.body && <p className="mt-1 text-sm text-muted-foreground">{display.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNotificationTime(n.createdAt, t, locale)}
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="mt-2 h-auto p-0 text-sm font-medium text-servido-700"
                      onClick={() => handleViewDetail(n)}
                    >
                      {t("viewDetail")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detailDisplay?.title || t("detailTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("detailTitle")}</DialogDescription>
          </DialogHeader>
          {detailDisplay?.body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{detailDisplay.body}</p>
          ) : null}
          {detailItem && (
            <p className="text-xs text-muted-foreground">
              {formatNotificationTime(detailItem.createdAt, t, locale)}
            </p>
          )}
          {!detailLink && (
            <p className="text-xs text-muted-foreground">{t("detailNoLinkHint")}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
              {t("detailClose")}
            </Button>
            {detailLink && (
              <Button asChild>
                <Link href={detailLink} onClick={() => setDetailOpen(false)}>
                  {t("detailGoTo")}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
