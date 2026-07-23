"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { subscribeUnreadNotificationCount } from "@/lib/notifications"
import { cn } from "@/lib/utils"

type NotificationBellProps = {
  className?: string
  iconClassName?: string
  /** Estilo compacto (solo icono) vs con label en desktop */
  showLabel?: boolean
}

export function NotificationBell({ className, iconClassName, showLabel = false }: NotificationBellProps) {
  const { currentUser } = useAuth()
  const [unread, setUnread] = useState(0)
  const uid = currentUser?.firebaseUser?.uid

  useEffect(() => {
    if (!uid) {
      setUnread(0)
      return
    }
    return subscribeUnreadNotificationCount(uid, setUnread)
  }, [uid])

  if (!uid) return null

  return (
    <Link
      href="/notifications"
      className={cn("inline-flex items-center justify-center gap-2 rounded-full transition", className)}
      aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
    >
      <span className="relative inline-flex">
        <Bell className={cn("h-5 w-5", iconClassName)} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      {showLabel && <span className="text-sm font-semibold">Avisos</span>}
    </Link>
  )
}
