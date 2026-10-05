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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BellRing, CheckCheck, MessageCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  isNotificationRead,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications"
import { resolveAppNotificationDisplay } from "@/lib/i18n/resolve-app-notification"
import { isServidoOfficialNotification } from "@/lib/servido-official"
import { syncAppointmentNotificationsForUser } from "@/lib/service-appointments"
import type { AppNotification } from "@/types/notifications"
import { resolveStoredHref } from "@/lib/routes"
import {
  NotificationListItem,
  isChatNotification,
} from "@/components/notifications/notification-list-item"
import { cn } from "@/lib/utils"

type FilterId = "all" | "unread" | "chat" | "activity"

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
  const diffMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffMs / (1000 * 60))
  const diffInHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffInMinutes < 1) return t("timeJustNow")
  if (diffInMinutes < 60) return t("timeMinutesAgo", { count: diffInMinutes })
  if (diffInHours < 24) return t("timeHoursAgo", { count: diffInHours })
  if (diffInHours < 48) return t("timeYesterday")
  return date.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "es-AR")
}

function createdAtMs(n: AppNotification): number {
  return n.createdAt?.toMillis?.() ?? (n.createdAt?.seconds ? n.createdAt.seconds * 1000 : 0)
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
  const [filter, setFilter] = useState<FilterId>("all")
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

    const q = query(collection(db, "notifications"), where("userId", "==", uid), limit(80))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))
        list.sort((a, b) => createdAtMs(b) - createdAtMs(a))
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
  const chatUnreadCount = useMemo(
    () => items.filter((n) => isChatNotification(n) && !isNotificationRead(n)).length,
    [items]
  )
  const activityUnreadCount = useMemo(
    () => items.filter((n) => !isChatNotification(n) && !isNotificationRead(n)).length,
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      const unread = !isNotificationRead(n)
      const chat = isChatNotification(n)
      if (filter === "unread") return unread
      if (filter === "chat") return chat
      if (filter === "activity") return !chat
      return true
    })
  }, [items, filter])

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

  const filters: { id: FilterId; label: string; count?: number }[] = [
    { id: "all", label: t("filterAll"), count: items.length },
    { id: "unread", label: t("filterUnread"), count: unreadCount },
    { id: "chat", label: t("filterChat"), count: chatUnreadCount },
    { id: "activity", label: t("filterActivity"), count: activityUnreadCount },
  ]

  if (!uid) {
    return (
      <div className="min-h-screen bg-[#f4f2f7] pb-24">
        <div className="container mx-auto max-w-screen-xl px-4 py-16 md:px-6">
          <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-servido-950/8">
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
    <div className="min-h-screen bg-[#f4f2f7] pb-24">
      <div className="border-b border-servido-950/5 bg-servido-950">
        <div className="container mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                <BellRing className="h-3.5 w-3.5 text-servido-gold" />
                Servido
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-2 text-sm text-white/70">
                {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allCaughtUp")}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={markingAll}
                onClick={() => void handleMarkAll()}
                className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                {t("markAllRead")}
              </Button>
            )}
          </div>

          {(chatUnreadCount > 0 || activityUnreadCount > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFilter("chat")}
                className="rounded-2xl bg-sky-500/15 px-3 py-3 text-left ring-1 ring-sky-300/30 transition hover:bg-sky-500/25"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("summaryChat")}
                </p>
                <p className="mt-1 text-lg font-semibold text-white">{chatUnreadCount}</p>
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className="rounded-2xl bg-servido-gold/15 px-3 py-3 text-left ring-1 ring-servido-gold/25 transition hover:bg-servido-gold/25"
              >
                <p className="text-xs font-semibold text-servido-gold">{t("summaryPending")}</p>
                <p className="mt-1 text-lg font-semibold text-white">{unreadCount}</p>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b border-servido-950/5 bg-[#f4f2f7]/95 backdrop-blur-md">
        <div className="container mx-auto max-w-2xl px-4 py-3 md:px-6">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition",
                  filter === item.id
                    ? item.id === "chat"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-servido-950 text-white shadow-sm"
                    : "bg-white text-slate-700 ring-1 ring-servido-950/8 hover:bg-servido-50"
                )}
              >
                {item.label}
                {typeof item.count === "number" && item.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      filter === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-5 md:px-6 md:py-6">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-servido-950/5">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-servido-950/5">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-300">
              {filter === "chat" ? (
                <MessageCircle className="h-8 w-8" />
              ) : (
                <BellRing className="h-8 w-8" />
              )}
            </span>
            <p className="mt-5 text-lg text-slate-600">
              {filter === "chat"
                ? t("emptyChat")
                : filter === "unread"
                  ? t("emptyUnread")
                  : t("empty")}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((n) => {
              const unread = !isNotificationRead(n)
              const display = resolveAppNotificationDisplay(n, tApp, locale)
              const meta = (n.meta || {}) as Record<string, unknown>
              const shippingStatus = String(
                (n as { shippingStatus?: string }).shippingStatus || meta.shippingStatus || ""
              )
              const servidoOfficial = isServidoOfficialNotification(meta)
              const isLive = String(n.type) === "live_started"
              const isChat = isChatNotification(n)
              const sellerPhoto =
                typeof meta.sellerPhotoURL === "string" ? meta.sellerPhotoURL : null
              const senderName =
                typeof meta.senderName === "string"
                  ? meta.senderName
                  : typeof meta.buyerName === "string"
                    ? meta.buyerName
                    : null

              return (
                <NotificationListItem
                  key={n.id}
                  title={display.title}
                  body={display.body}
                  timeLabel={formatNotificationTime(n.createdAt, t, locale)}
                  unread={unread}
                  type={String(n.type)}
                  shippingStatus={shippingStatus}
                  servidoOfficial={servidoOfficial}
                  isLive={isLive}
                  sellerPhoto={sellerPhoto}
                  senderName={senderName}
                  onOpen={() => handleViewDetail(n)}
                  ctaLabel={
                    isLive ? t("watchLive") : isChat ? t("openChat") : t("viewDetail")
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-servido-950">
              {detailDisplay?.title || t("detailTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("detailTitle")}</DialogDescription>
          </DialogHeader>
          {detailDisplay?.body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {detailDisplay.body}
            </p>
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
                  {detailItem && isChatNotification(detailItem)
                    ? t("openChat")
                    : t("detailGoTo")}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
