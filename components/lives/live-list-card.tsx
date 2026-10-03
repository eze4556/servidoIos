"use client"

import Link from "next/link"
import { Eye, ShoppingBag } from "lucide-react"
import type { LiveSession } from "@/types/live"
import { liveHref } from "@/lib/routes"
import { cn } from "@/lib/utils"

function formatPrice(price: number, currency?: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    maximumFractionDigits: 0,
  }).format(price || 0)
}

/** Card rica para la lista /lives. */
export function LiveListCard({ live, className }: { live: LiveSession; className?: string }) {
  const pinned = live.pinnedProduct || live.pinnedProducts?.[0] || null
  const cover = pinned?.imageUrl || live.sellerPhotoURL || null

  return (
    <Link
      href={liveHref(live.id)}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-servido-950/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-servido-800/15",
        className
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-servido-900 to-servido-950">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/80">
            {live.sellerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            En vivo
          </span>
          {pinned?.category ? (
            <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {pinned.category}
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2">
          <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/80">
            {live.sellerPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={live.sellerPhotoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-servido-800 text-sm font-bold text-white">
                {live.sellerName.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{live.sellerName}</p>
            <p className="truncate text-xs text-white/80">{live.title}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Eye className="h-3.5 w-3.5" />
            {live.viewerCount}
          </span>
        </div>
      </div>

      {pinned ? (
        <div className="flex items-center gap-3 border-t border-servido-950/5 px-3 py-2.5">
          <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-servido-50 ring-1 ring-servido-950/5">
            {pinned.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pinned.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-servido-700">
                <ShoppingBag className="h-4 w-4" />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-servido-700">
              En venta ahora
            </p>
            <p className="truncate text-sm font-medium text-servido-950">{pinned.title}</p>
          </div>
          <p className="shrink-0 text-sm font-bold text-servido-900">
            {formatPrice(pinned.price, pinned.currency)}
          </p>
        </div>
      ) : (
        <div className="px-3 py-2.5 text-xs text-slate-500">Entrá a mirar y chatear</div>
      )}
    </Link>
  )
}
