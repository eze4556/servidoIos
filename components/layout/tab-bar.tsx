"use client"

import Link from "next/link"
import { Home, MessageCircle, Sparkles, User, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { useChatUnread } from "@/components/chat/chat-unread-context"

export function TabBar() {
  const { authLoading, getDashboardLink } = useAuth()
  const pathname = usePathname()
  const { unreadCount } = useChatUnread()

  const tabItems = [
    {
      name: "Inicio",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      name: "Seguir",
      icon: UserPlus,
      href: "/siguiendo",
      active: pathname.startsWith("/siguiendo"),
    },
    {
      name: "Historias",
      icon: Sparkles,
      href: "/historias",
      active: pathname.startsWith("/historias"),
    },
    {
      name: "Chat",
      icon: MessageCircle,
      href: "/mensajes",
      active: pathname.startsWith("/mensajes") || pathname.startsWith("/chat"),
      badge: unreadCount,
    },
    {
      name: "Mi Cuenta",
      icon: User,
      href: getDashboardLink(),
      active:
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname === "/login" ||
        pathname === "/signup",
    },
  ]

  if (authLoading) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(76,29,149,0.08)] lg:hidden">
      <nav className="mx-auto flex h-16 max-w-screen-sm items-center justify-around px-1">
        {tabItems.map((item) => (
          <Link key={item.name} href={item.href} className="min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={`relative flex h-full w-full min-w-0 flex-col gap-0.5 px-1 py-2 text-xs ${
                item.active
                  ? "font-semibold text-servido-700"
                  : "text-gray-500 hover:text-servido-600"
              }`}
            >
              <span className="relative">
                <item.icon
                  className={`h-5 w-5 shrink-0 ${item.active ? "text-servido-700" : ""}`}
                />
                {"badge" in item && typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              <span className="truncate text-[10px] leading-tight">{item.name}</span>
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  )
}
