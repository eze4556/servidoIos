"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Radio } from "lucide-react"
import { subscribeActiveLives } from "@/lib/lives"
import type { LiveSession } from "@/types/live"
import { liveHref } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

export function LivesRail({ className }: { className?: string }) {
  const { currentUser } = useAuth()
  const [lives, setLives] = useState<LiveSession[]>([])
  const canHost =
    currentUser?.role === "seller" && currentUser.businessType !== "restaurant"

  useEffect(() => {
    return subscribeActiveLives(setLives, (err) => console.error("[lives-rail]", err))
  }, [])

  if (lives.length === 0 && !canHost) return null

  return (
    <section className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-servido-950">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          En vivo
        </h2>
        <Link href="/lives" className="text-xs font-medium text-servido-800">
          Ver todos
        </Link>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
        {canHost ? (
          <Link
            href="/dashboard/seller/live"
            className="flex w-[72px] shrink-0 flex-col items-center gap-1"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-servido-900 text-white shadow-md ring-2 ring-white">
              <Radio className="h-6 w-6" />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-gray-700">
              Transmitir
            </span>
          </Link>
        ) : null}
        {lives.map((live) => (
          <Link
            key={live.id}
            href={liveHref(live.id)}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1"
          >
            <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-servido-100 p-[2px] ring-2 ring-red-500">
              <span className="relative h-full w-full overflow-hidden rounded-full bg-servido-900">
                {live.sellerPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={live.sellerPhotoURL}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                    {live.sellerName.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-red-600 px-1 text-[8px] font-bold uppercase text-white">
                Live
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-gray-700">
              {live.sellerName}
            </span>
            {live.viewerCount > 0 ? (
              <span className="text-[9px] font-medium text-red-600">
                {live.viewerCount} mirando
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
