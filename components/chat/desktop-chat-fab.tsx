"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useChatUnread } from "@/components/chat/chat-unread-context"

export function DesktopChatFab() {
  const { currentUser } = useAuth()
  const pathname = usePathname()
  const { unreadCount } = useChatUnread()
  const [fabHidden, setFabHidden] = useState(false)

  const onMessaging = pathname?.startsWith("/mensajes") || pathname?.startsWith("/chat/")
  if (!currentUser || onMessaging || fabHidden) return null

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] hidden lg:block">
      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setFabHidden(true)}
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white shadow"
          aria-label="Ocultar chat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <Link
          href="/mensajes"
          className="relative flex h-14 items-center gap-2 rounded-full bg-servido-800 px-5 text-white shadow-xl shadow-servido-900/30 transition hover:bg-servido-900"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Chat</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
