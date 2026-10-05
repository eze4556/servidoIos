"use client"

import {
  AlertCircle,
  BellRing,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MessageCircle,
  Package,
  Radio,
  Truck,
  UtensilsCrossed,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { ServidoOfficialAvatar } from "@/components/chat/servido-official-avatar"
import { cn } from "@/lib/utils"
import type { AppNotification } from "@/types/notifications"

export function isChatNotification(n: AppNotification): boolean {
  const type = String(n.type || "")
  return type === "chat" || type === "message"
}

export function notificationIconFor(type: string, shippingStatus?: string): LucideIcon {
  if (type === "chat" || type === "message") return MessageCircle
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
  if (type === "live_started") return Radio
  if (type === "claim") return AlertCircle
  return AlertCircle
}

function senderInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  return trimmed.charAt(0).toUpperCase()
}

type NotificationListItemProps = {
  title: string
  body: string
  timeLabel: string
  unread: boolean
  type: string
  shippingStatus?: string
  servidoOfficial?: boolean
  isLive?: boolean
  sellerPhoto?: string | null
  senderName?: string | null
  onOpen: () => void
  ctaLabel: string
}

export function NotificationListItem({
  title,
  body,
  timeLabel,
  unread,
  type,
  shippingStatus,
  servidoOfficial,
  isLive,
  sellerPhoto,
  senderName,
  onOpen,
  ctaLabel,
}: NotificationListItemProps) {
  const t = useTranslations("notifications")
  const isChat = type === "chat" || type === "message"
  const Icon = notificationIconFor(type, shippingStatus)

  if (isChat) {
    const name = senderName?.trim() || t("chatSenderFallback")
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group w-full rounded-2xl p-3.5 text-left transition duration-300 sm:p-4",
          unread
            ? "bg-gradient-to-r from-sky-50 via-white to-white shadow-sm ring-2 ring-sky-300/70"
            : "bg-white shadow-sm ring-1 ring-slate-200/80 hover:ring-sky-200"
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold",
              unread
                ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                : "bg-sky-100 text-sky-800"
            )}
          >
            {senderInitial(name)}
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-sky-100">
              <MessageCircle className="h-3 w-3 text-sky-600" />
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                  {t("chatBadge")}
                </p>
                <h3 className="mt-0.5 truncate text-base font-semibold text-servido-950">
                  {name}
                </h3>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-slate-400">{timeLabel}</span>
                {unread && (
                  <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("pendingBadge")}
                  </span>
                )}
              </div>
            </div>

            <div
              className={cn(
                "mt-2 rounded-2xl rounded-tl-md px-3 py-2.5 text-sm leading-relaxed",
                unread
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700"
              )}
            >
              <p className="line-clamp-3">{body || t("chatEmptyPreview")}</p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{title}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  unread
                    ? "bg-sky-600 text-white group-hover:bg-sky-700"
                    : "bg-sky-50 text-sky-800 group-hover:bg-sky-100"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {ctaLabel}
              </span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full rounded-2xl p-3.5 text-left transition duration-300 sm:p-4",
        isLive
          ? unread
            ? "bg-white shadow-sm ring-2 ring-red-400/80"
            : "bg-white shadow-sm ring-1 ring-red-200"
          : unread
            ? "bg-white shadow-sm ring-2 ring-servido-300/80"
            : "bg-white shadow-sm ring-1 ring-servido-950/6 hover:ring-servido-200"
      )}
    >
      <div className="flex items-start gap-3">
        {servidoOfficial ? (
          <ServidoOfficialAvatar size={40} className="mt-0.5 shrink-0" />
        ) : isLive && sellerPhoto ? (
          <span className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-2xl ring-2 ring-red-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sellerPhoto} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <span
            className={cn(
              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              isLive
                ? "bg-red-600 text-white"
                : unread
                  ? "bg-servido-950 text-servido-gold"
                  : "bg-servido-50 text-servido-800"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-base leading-snug text-servido-950",
                unread ? "font-semibold" : "font-medium"
              )}
            >
              {title}
            </h3>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] text-slate-400">{timeLabel}</span>
              {unread && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
                    isLive ? "bg-red-500" : "bg-servido-800"
                  )}
                >
                  {t("pendingBadge")}
                </span>
              )}
            </div>
          </div>

          {body ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{body}</p>
          ) : null}

          <div className="mt-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition",
                isLive
                  ? "bg-red-50 text-red-700 group-hover:bg-red-100"
                  : unread
                    ? "bg-servido-950 text-white group-hover:bg-servido-800"
                    : "bg-servido-50 text-servido-800 group-hover:bg-servido-100"
              )}
            >
              {ctaLabel}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
