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

export function TabBar() {
  const t = useTranslations("tabBar")
  const { authLoading, currentUser, getDashboardLink } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { unreadCount } = useChatUnread()

  const sellHref = useMemo(() => getSellHref(currentUser), [currentUser])
  const profileHref = getDashboardLink()
  const favoritesHref = currentUser ? "/favorites" : "/login?redirect=/favorites"
  const sellLabel = t("sell")

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
      "flex min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-1.5 px-1 pb-2 pt-2.5 text-[13px] font-medium leading-none transition-colors",
      active ? "font-semibold text-purple-700" : "text-gray-500"
    )

  const lineIconClass = (active: boolean) =>
    cn("h-[26px] w-[26px] shrink-0", active ? "text-purple-700" : "text-gray-500")

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <nav className="pointer-events-auto relative mx-auto max-w-screen-sm rounded-[1.75rem] bg-white px-1.5 pb-2 pt-5 shadow-[0_10px_40px_rgba(76,29,149,0.18)]">
        <div className="flex items-end">
          <Link
            href="/"
            className={cn(tabClass(isHome), isHome && "rounded-[1.35rem] bg-purple-50")}
          >
            <Home
              className={lineIconClass(isHome)}
              strokeWidth={isHome ? 2.25 : 2}
              fill={isHome ? "currentColor" : "none"}
            />
            <span className="max-w-full truncate">{t("home")}</span>
          </Link>

          <Link
            href={favoritesHref}
            className={cn(tabClass(isFavorites), isFavorites && "rounded-[1.35rem] bg-purple-50")}
          >
            <Heart
              className={lineIconClass(isFavorites)}
              strokeWidth={isFavorites ? 2.25 : 2}
              fill={isFavorites ? "currentColor" : "none"}
            />
            <span className="max-w-full truncate">{t("favorites")}</span>
          </Link>

          {/* Botón central: el círculo se posiciona respecto al nav (sale del borde superior),
              la etiqueta queda alineada con el resto de los tabs. */}
          <Link
            href={sellHref}
            className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-1.5 px-1 pb-2 pt-2.5 text-[13px] font-semibold leading-none text-purple-700"
            aria-current={isSell ? "page" : undefined}
            aria-label={sellLabel}
          >
            <span
              className={cn(
                "absolute left-1/2 top-0 flex h-[3.75rem] w-[3.75rem] -translate-x-1/2 -translate-y-[26%] items-center justify-center rounded-full bg-gradient-to-b from-purple-600 to-purple-700 text-white shadow-[0_8px_20px_rgba(88,28,135,0.35)] ring-[6px] ring-white",
                isSell && "scale-[1.03]"
              )}
            >
              <Plus className="h-8 w-8" strokeWidth={2.5} />
            </span>
            <span className="h-[26px]" aria-hidden />
            <span className="max-w-full truncate">{sellLabel}</span>
          </Link>

          <Link href="/mensajes" className={tabClass(isChat)}>
            <span className={`relative ${TAB_ICON_BOX}`}>
              <MessageCircle className={lineIconClass(isChat)} strokeWidth={isChat ? 2.25 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="max-w-full truncate">{t("chats")}</span>
          </Link>

          <Link
            href={profileHref}
            className={cn(tabClass(isProfile), isProfile && "rounded-[1.35rem] bg-purple-50")}
          >
            <User className={lineIconClass(isProfile)} strokeWidth={isProfile ? 2.25 : 2} />
            <span className="max-w-full truncate">{t("profile")}</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
