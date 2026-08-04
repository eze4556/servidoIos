"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Home, MessageCircle, Plus, Search, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import type { UserProfile } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { useChatUnread } from "@/components/chat/chat-unread-context"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { listActiveStories } from "@/lib/stories"

function getPublishHref(user: ReturnType<typeof useAuth>["currentUser"]): string {
  if (!user) return "/products"
  switch (user.role) {
    case "admin":
      return "/admin"
    case "cadete":
      return "/dashboard/cadete"
    case "seller":
      if (user.businessType === "restaurant") return "/dashboard/restaurant"
      return "/historias/nueva"
    default:
      return "/products"
  }
}

function HistoriasTabIcon({ active, hasStories }: { active: boolean; hasStories: boolean }) {
  return (
    <span className="relative flex h-7 w-7 items-center justify-center">
      {hasStories ? (
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-indigo-500 p-[2px]"
          aria-hidden
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
            <Plus className="h-3.5 w-3.5 text-purple-700" strokeWidth={2.5} />
          </span>
        </span>
      ) : (
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed",
            active ? "border-purple-600" : "border-purple-400/90"
          )}
          aria-hidden
        >
          <Plus className="h-3.5 w-3.5 text-purple-600" strokeWidth={2.5} />
        </span>
      )}
    </span>
  )
}

export function TabBar() {
  const t = useTranslations("tabBar")
  const { authLoading, currentUser, getDashboardLink } = useAuth()
  const pathname = usePathname()
  const { unreadCount } = useChatUnread()
  const [hasStories, setHasStories] = useState(false)

  const publishHref = useMemo(() => getPublishHref(currentUser), [currentUser])
  const profileHref = getDashboardLink()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const stories = await listActiveStories()
        if (!cancelled) setHasStories(stories.length > 0)
      } catch {
        if (!cancelled) setHasStories(false)
      }
    }
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pathname])

  if (authLoading) {
    return null
  }

  const isHome = pathname === "/"
  const isSearch = pathname.startsWith("/search")
  const isPublish =
    pathname === publishHref ||
    (publishHref === "/products" && pathname.startsWith("/products")) ||
    pathname.startsWith("/historias/nueva")
  const isChat = pathname.startsWith("/mensajes") || pathname.startsWith("/chat")
  const isStories = pathname.startsWith("/historias")
  const isProfile =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/signup"

  const sideTabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-1 pt-2 text-[10px] font-medium leading-tight transition-colors",
      active ? "text-purple-700" : "text-gray-500"
    )

  const iconClass = (active: boolean) => cn("h-[22px] w-[22px]", active && "text-purple-700")

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <nav className="relative mx-auto max-w-screen-sm rounded-t-[1.35rem] border-t border-purple-100/80 bg-white px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_32px_rgba(76,29,149,0.12)]">
        <div className="flex items-end justify-between">
          <Link href="/" className={sideTabClass(isHome)}>
            <Home className={iconClass(isHome)} strokeWidth={isHome ? 2.25 : 2} />
            <span>{t("home")}</span>
          </Link>

          <Link href="/search" className={sideTabClass(isSearch)}>
            <Search className={iconClass(isSearch)} strokeWidth={isSearch ? 2.25 : 2} />
            <span>{t("search")}</span>
          </Link>

          <div className="flex min-w-[4.5rem] flex-col items-center justify-end pb-0.5">
            <Link
              href={publishHref}
              className="relative -mt-7 flex flex-col items-center gap-1"
              aria-current={isPublish ? "page" : undefined}
            >
              <span className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg shadow-purple-900/25 ring-4 ring-white">
                <Plus className="h-8 w-8" strokeWidth={2.5} />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight",
                  isPublish ? "text-purple-700" : "text-gray-600"
                )}
              >
                {t("publish")}
              </span>
            </Link>
          </div>

          <Link href="/mensajes" className={sideTabClass(isChat)}>
            <span className="relative">
              <MessageCircle className={iconClass(isChat)} strokeWidth={isChat ? 2.25 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span>{t("chats")}</span>
          </Link>

          <Link href="/historias" className={sideTabClass(isStories)}>
            <HistoriasTabIcon active={isStories} hasStories={hasStories} />
            <span className={isStories ? "text-purple-700" : undefined}>{t("stories")}</span>
          </Link>

          <Link href={profileHref} className={sideTabClass(isProfile)}>
            <User className={iconClass(isProfile)} strokeWidth={isProfile ? 2.25 : 2} />
            <span>{t("profile")}</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
