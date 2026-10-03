"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Eye, Radio } from "lucide-react"
import { subscribeActiveLives } from "@/lib/lives"
import { subscribeFollowingIds } from "@/lib/follows"
import type { LiveSession } from "@/types/live"
import { liveHref } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { LiveRailVideoThumb } from "@/components/lives/live-rail-video-thumb"

function formatPrice(price: number, currency?: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    maximumFractionDigits: 0,
  }).format(price || 0)
}

function pickPreviewLiveId(
  lives: LiveSession[],
  visibility: Record<string, number>,
  uid: string | undefined
): string | null {
  if (!uid) return null
  let bestId: string | null = null
  let bestRatio = 0.35
  for (const live of lives) {
    if (live.sellerId === uid) continue
    const ratio = visibility[live.id] || 0
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestId = live.id
    }
  }
  return bestId
}

function LiveRailCard({
  live,
  enableVideo,
  onRatioChange,
}: {
  live: LiveSession
  enableVideo: boolean
  onRatioChange: (liveId: string, ratio: number) => void
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const pinned = live.pinnedProduct || live.pinnedProducts?.[0]
  const cover = pinned?.imageUrl || live.sellerPhotoURL
  const onRatioChangeRef = useRef(onRatioChange)
  onRatioChangeRef.current = onRatioChange

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        onRatioChangeRef.current(
          live.id,
          entry.isIntersecting ? entry.intersectionRatio : 0
        )
      },
      { threshold: [0, 0.35, 0.6, 0.85, 1], rootMargin: "0px 40px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [live.id])

  return (
    <Link
      ref={ref}
      href={liveHref(live.id)}
      className="group relative w-[118px] shrink-0 snap-start"
      aria-label={`${live.sellerName} en vivo${pinned ? `: ${pinned.title}` : ""}`}
    >
      <span
        className={cn(
          "relative block aspect-[9/14] overflow-hidden rounded-2xl bg-servido-950",
          "ring-2 ring-red-500/90 shadow-[0_10px_28px_-14px_rgba(185,28,28,0.55)]",
          "transition duration-300 group-hover:ring-red-400 group-active:scale-[0.98]"
        )}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-servido-800 to-servido-950 text-3xl font-bold text-white/85">
            {live.sellerName.charAt(0).toUpperCase()}
          </span>
        )}

        {enableVideo ? <LiveRailVideoThumb liveId={live.id} /> : null}

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-live-rail-shine bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.14)_50%,transparent_60%)] bg-[length:200%_100%]"
        />

        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

        <span className="absolute left-1.5 top-1.5 flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
            Live
          </span>
        </span>

        {live.viewerCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
            <Eye className="h-2.5 w-2.5" />
            {live.viewerCount}
          </span>
        ) : null}

        <span className="absolute inset-x-0 bottom-0 space-y-0.5 p-2">
          <span className="flex items-center gap-1.5">
            <span className="h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-white/70">
              {live.sellerPhotoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={live.sellerPhotoURL}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-servido-800 text-[8px] font-bold text-white">
                  {live.sellerName.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="truncate text-[11px] font-semibold text-white">
              {live.sellerName}
            </span>
          </span>
          <span className="line-clamp-2 text-[10px] leading-snug text-white/85">
            {live.title}
          </span>
          {pinned ? (
            <span className="mt-0.5 inline-flex max-w-full truncate rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-servido-950">
              {formatPrice(pinned.price, pinned.currency)}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

export function LivesRail({ className }: { className?: string }) {
  const { currentUser } = useAuth()
  const [lives, setLives] = useState<LiveSession[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [visibility, setVisibility] = useState<Record<string, number>>({})
  const canHost =
    currentUser?.role === "seller" && currentUser.businessType !== "restaurant"
  const uid = currentUser?.firebaseUser.uid

  useEffect(() => {
    return subscribeActiveLives(setLives, (err) => console.error("[lives-rail]", err))
  }, [])

  useEffect(() => {
    if (!uid) {
      setFollowing(new Set())
      return
    }
    return subscribeFollowingIds(uid, setFollowing)
  }, [uid])

  const sortedLives = useMemo(() => {
    if (following.size === 0) return lives
    return [...lives].sort((a, b) => {
      const aF = following.has(a.sellerId) ? 1 : 0
      const bF = following.has(b.sellerId) ? 1 : 0
      if (aF !== bF) return bF - aF
      return (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0)
    })
  }, [lives, following])

  const onRatioChange = (liveId: string, ratio: number) => {
    setVisibility((prev) => {
      const prevRatio = prev[liveId] || 0
      if (Math.abs(prevRatio - ratio) < 0.05) return prev
      return { ...prev, [liveId]: ratio }
    })
  }

  const previewLiveId = pickPreviewLiveId(sortedLives, visibility, uid)

  if (lives.length === 0 && !canHost) return null

  return (
    <section className={cn("w-full", className)}>
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-servido-950">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          En vivo ahora
        </h2>
        <Link href="/lives" className="text-xs font-medium text-servido-800">
          Ver todos
        </Link>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
        {canHost ? (
          <Link
            href="/dashboard/seller/live"
            className="relative w-[118px] shrink-0 snap-start"
          >
            <span className="flex aspect-[9/14] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-servido-950 text-white shadow-md ring-2 ring-white">
              <Radio className="h-7 w-7" />
              <span className="px-2 text-center text-[11px] font-semibold leading-tight">
                Transmitir
              </span>
            </span>
          </Link>
        ) : null}
        {sortedLives.map((live) => (
          <LiveRailCard
            key={live.id}
            live={live}
            enableVideo={previewLiveId === live.id}
            onRatioChange={onRatioChange}
          />
        ))}
      </div>
    </section>
  )
}
