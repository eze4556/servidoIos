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
import { resolveStoredHref } from "@/lib/routes"

function normalizeNotificationLink(link: unknown): string | null {
  if (typeof link !== "string") return null
  const trimmed = link.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return resolveStoredHref(path)
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
        <div className="container mx-auto max-w-screen-xl px-4 py-16 md:px-6">
          <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-12 text-center shadow-[0_24px_50px_-28px_rgba(46,16,101,0.32)] ring-1 ring-servido-950/5">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-800">
              <BellRing className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-servido-950">{t("title")}</h1>
            <p className="mt-3 text-slate-600">{t("loginHint")}</p>
            <Button
              asChild
              className="mt-8 w-full rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
            >
              <Link href="/login">{tAuth("loginButton")}</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <section className="mx-auto mb-8 max-w-2xl overflow-hidden rounded-2xl bg-servido-950 shadow-[0_24px_60px_-28px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 lg:mb-10 lg:rounded-[1.75rem]">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  <BellRing className="h-3.5 w-3.5 text-servido-gold" />
                  Servido
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {t("title")}
                </h1>
                {unreadCount > 0 && (
                  <p className="mt-3 text-sm text-white/70">
                    {t("unreadCount", { count: unreadCount })}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={markingAll}
                  onClick={() => void handleMarkAll()}
                  className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  {t("markAllRead")}
                </Button>
              )}
            </div>
          </div>
        </section>

      {loading ? (
        <div className="mx-auto grid max-w-2xl gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-4 shadow-[0_12px_32px_-24px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5"
            >
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mx-auto max-w-2xl rounded-3xl bg-white px-6 py-16 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-300">
            <BellRing className="h-8 w-8" />
          </span>
          <p className="mt-5 text-lg text-slate-600">{t("empty")}</p>
        </div>
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
                className={`overflow-hidden rounded-2xl border-0 bg-white shadow-[0_12px_32px_-24px_rgba(46,16,101,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(46,16,101,0.32)] ${
                  unread ? "ring-1 ring-servido-300" : "ring-1 ring-servido-950/5"
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {servidoOfficial ? (
                    <ServidoOfficialAvatar size={28} className="mt-0.5 shrink-0" />
                  ) : (
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        unread ? "bg-servido-950 text-servido-gold" : "bg-servido-50 text-servido-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-snug text-servido-950">
                        {display.title}
                      </h3>
                      {unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-servido-gold ring-2 ring-servido-gold/25" />
                      )}
                    </div>
                    {display.body && <p className="mt-1 text-sm text-slate-600">{display.body}</p>}
                    <p className="mt-1.5 text-xs text-slate-400">
                      {formatNotificationTime(n.createdAt, t, locale)}
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="mt-2 h-auto p-0 text-sm font-semibold text-servido-800"
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
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-servido-950">
              {detailDisplay?.title || t("detailTitle")}
            </DialogTitle>
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
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-servido-200 text-servido-900 hover:bg-servido-50"
              onClick={() => setDetailOpen(false)}
            >
              {t("detailClose")}
            </Button>
            {detailLink && (
              <Button
                asChild
                className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
              >
                <Link href={detailLink} onClick={() => setDetailOpen(false)}>
                  {t("detailGoTo")}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
