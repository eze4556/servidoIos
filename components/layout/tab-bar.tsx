"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Heart, Home, MessageCircle, Plus, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname, useSearchParams } from "next/navigation"
import { useChatUnread } from "@/components/chat/chat-unread-context"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const TAB_ICON_BOX = "flex h-7 w-7 shrink-0 items-center justify-center"

function getSellHref(user: { role?: string; businessType?: string } | null): string {
  if (!user) return "/signup?role=seller"
  switch (user.role) {
    case "admin":
      return "/admin"
    case "cadete":
      return "/dashboard/cadete"
    case "seller":
      if (user.businessType === "restaurant") return "/dashboard/restaurant"
      return "/dashboard/seller?tab=addProduct"
    default:
      return "/dashboard/buyer?tab=reseller"
  }
}

function SellTabButton({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className="relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-end pb-1.5 pt-6"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "absolute -top-3 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-[0_6px_20px_rgba(88,28,135,0.45)] ring-4 ring-white transition-transform",
          active && "scale-[1.03] ring-purple-100"
        )}
        aria-hidden
      >
        <Plus className="h-7 w-7" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "max-w-full truncate px-0.5 text-[10px] font-semibold leading-tight",
          active ? "text-purple-700" : "text-purple-600"
        )}
      >
        {label}
      </span>
    </Link>
  )
}

export function TabBar() {
  const t = useTranslations("tabBar")
  const { authLoading, currentUser, getDashboardLink } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { unreadCount } = useChatUnread()

  const sellHref = useMemo(() => getSellHref(currentUser), [currentUser])
  const profileHref = getDashboardLink()
  const favoritesHref = currentUser ? "/favorites" : "/login?redirect=/favorites"

  if (authLoading) {
    return null
  }

  const tabParam = searchParams.get("tab")
  const isHome = pathname === "/"
  const isFavorites = pathname.startsWith("/favorites")
  const isSell =
    pathname === sellHref ||
    (pathname.startsWith("/dashboard/buyer") && tabParam === "reseller") ||
    (pathname.startsWith("/dashboard/seller") &&
      (tabParam === "addProduct" || tabParam === "addService")) ||
    pathname.startsWith("/historias/nueva")
  const isChat = pathname.startsWith("/mensajes") || pathname.startsWith("/chat")
  const isProfile =
    !isSell &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname === "/login" ||
      pathname.startsWith("/signup"))

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-0.5 pb-1.5 pt-2 text-[10px] font-medium leading-tight transition-colors",
      active ? "font-semibold text-purple-700" : "text-gray-500"
    )

  const lineIconClass = (active: boolean) =>
    cn("h-[22px] w-[22px] shrink-0", active ? "text-purple-700" : "text-gray-500")

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <nav className="mx-auto max-w-screen-sm rounded-t-[1.35rem] border-t border-purple-100/80 bg-white px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(76,29,149,0.12)]">
        <div className="flex items-end">
          <Link
            href="/"
            className={cn(tabClass(isHome), isHome && "rounded-2xl bg-purple-100/90 py-2")}
          >
            <Home className={lineIconClass(isHome)} strokeWidth={isHome ? 2.25 : 2} />
            <span className="max-w-full truncate px-0.5">{t("home")}</span>
          </Link>

          <Link
            href={favoritesHref}
            className={cn(tabClass(isFavorites), isFavorites && "rounded-2xl bg-purple-100/90 py-2")}
          >
            <Heart
              className={lineIconClass(isFavorites)}
              strokeWidth={isFavorites ? 2.25 : 2}
              fill={isFavorites ? "currentColor" : "none"}
            />
            <span className="max-w-full truncate px-0.5">{t("favorites")}</span>
          </Link>

          <SellTabButton active={isSell} href={sellHref} label={t("sell")} />

          <Link href="/mensajes" className={tabClass(isChat)}>
            <span className={`relative ${TAB_ICON_BOX}`}>
              <MessageCircle className={lineIconClass(isChat)} strokeWidth={isChat ? 2.25 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5">{t("chats")}</span>
          </Link>

          <Link
            href={profileHref}
            className={cn(tabClass(isProfile), isProfile && "rounded-2xl bg-purple-100/90 py-2")}
          >
            <User className={lineIconClass(isProfile)} strokeWidth={isProfile ? 2.25 : 2} />
            <span className="max-w-full truncate px-0.5">{t("profile")}</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
