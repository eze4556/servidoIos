"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Home, MessageCircle, Plus, Search, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { useChatUnread } from "@/components/chat/chat-unread-context"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { listActiveStories } from "@/lib/stories"

const TAB_ICON_BOX = "flex h-7 w-7 shrink-0 items-center justify-center"

function getPublishHref(user: { role?: string; businessType?: string } | null): string {
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
    <span className={TAB_ICON_BOX}>
      {hasStories ? (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-indigo-500 p-[2px]"
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

function PublishTabIcon({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        TAB_ICON_BOX,
        "rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-md shadow-purple-900/20",
        active && "ring-2 ring-purple-300 ring-offset-1"
      )}
      aria-hidden
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
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

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-0.5 pb-1.5 pt-2 text-[10px] font-medium leading-tight transition-colors",
      active ? "font-semibold text-purple-700" : "text-gray-500"
    )

  const lineIconClass = (active: boolean) =>
    cn("h-[22px] w-[22px] shrink-0", active ? "text-purple-700" : "text-gray-500")

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <nav className="mx-auto max-w-screen-sm rounded-t-[1.35rem] border-t border-purple-100/80 bg-white px-0.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_32px_rgba(76,29,149,0.12)]">
        <div className="flex items-stretch">
          <Link href="/" className={tabClass(isHome)}>
            <Home className={lineIconClass(isHome)} strokeWidth={isHome ? 2.25 : 2} />
            <span className="max-w-full truncate px-0.5">{t("home")}</span>
          </Link>

          <Link href="/search" className={tabClass(isSearch)}>
            <Search className={lineIconClass(isSearch)} strokeWidth={isSearch ? 2.25 : 2} />
            <span className="max-w-full truncate px-0.5">{t("search")}</span>
          </Link>

          <Link href={publishHref} className={tabClass(isPublish)} aria-current={isPublish ? "page" : undefined}>
            <PublishTabIcon active={isPublish} />
            <span className="max-w-full truncate px-0.5">{t("publish")}</span>
          </Link>

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

          <Link href="/historias" className={tabClass(isStories)}>
            <HistoriasTabIcon active={isStories} hasStories={hasStories} />
            <span className={cn("max-w-full truncate px-0.5", isStories && "text-purple-700")}>{t("stories")}</span>
          </Link>

          <Link href={profileHref} className={tabClass(isProfile)}>
            <User className={lineIconClass(isProfile)} strokeWidth={isProfile ? 2.25 : 2} />
            <span className="max-w-full truncate px-0.5">{t("profile")}</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
