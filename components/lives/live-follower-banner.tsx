"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Radio, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { subscribeFollowingIds } from "@/lib/follows"
import { subscribeActiveLives } from "@/lib/lives"
import type { LiveSession } from "@/types/live"
import { liveHref } from "@/lib/routes"
import { cn } from "@/lib/utils"

const DISMISS_KEY = "servido:live-banner-dismissed"

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

/**
 * Banner in-app cuando un comercio que seguís está en vivo.
 * Complementa la push + notificación en la campanita.
 */
export function LiveFollowerBanner() {
  const { currentUser } = useAuth()
  const pathname = usePathname()
  const uid = currentUser?.firebaseUser.uid
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [lives, setLives] = useState<LiveSession[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed())

  useEffect(() => {
    if (!uid) {
      setFollowing(new Set())
      return
    }
    return subscribeFollowingIds(uid, setFollowing)
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setLives([])
      return
    }
    return subscribeActiveLives(setLives, (err) =>
      console.warn("[live-follower-banner]", err)
    )
  }, [uid])

  const alertLive = useMemo(() => {
    if (!uid || following.size === 0) return null
    const currentLiveId =
      pathname?.startsWith("/lives/") ? pathname.split("/")[2] : null

    return (
      lives.find((live) => {
        if (live.sellerId === uid) return false
        if (!following.has(live.sellerId)) return false
        if (dismissed.has(live.id)) return false
        if (currentLiveId && currentLiveId === live.id) return false
        return true
      }) || null
    )
  }, [uid, following, lives, dismissed, pathname])

  const hideOnImmersive =
    pathname?.startsWith("/lives/") ||
    pathname?.startsWith("/dashboard/seller/live") ||
    pathname?.startsWith("/chat") ||
    pathname === "/login" ||
    pathname === "/signup"

  if (!alertLive || hideOnImmersive) return null

  const dismiss = () => {
    const next = new Set(dismissed)
    next.add(alertLive.id)
    setDismissed(next)
    writeDismissed(next)
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6"
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-2xl bg-servido-950 px-3 py-2.5 text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.55)] ring-2 ring-red-500/80">
        <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-red-500">
          {alertLive.sellerPhotoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={alertLive.sellerPhotoURL}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-servido-800 text-sm font-bold">
              {alertLive.sellerName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-red-600 px-1 text-[7px] font-bold uppercase leading-none">
            Live
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-red-400">
            <Radio className="h-3 w-3" />
            En vivo ahora
          </p>
          <p className="truncate text-sm font-semibold">
            {alertLive.sellerName} está en vivo
          </p>
          <p className="truncate text-xs text-white/70">{alertLive.title}</p>
        </div>

        <Link
          href={liveHref(alertLive.id)}
          className="shrink-0 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500"
        >
          Mirar
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
