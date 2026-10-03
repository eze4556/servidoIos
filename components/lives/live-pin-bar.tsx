"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react"
import type { LivePinnedProduct } from "@/types/live"
import { reportLiveBuyClickApi } from "@/lib/lives"
import { productHref } from "@/lib/routes"
import { cn } from "@/lib/utils"

function formatPrice(product: LivePinnedProduct) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: product.currency || "ARS",
    maximumFractionDigits: 0,
  }).format(product.price || 0)
}

function PinCard({
  product,
  canUnpin,
  onUnpin,
  featured,
  liveId,
  trackBuyClicks,
}: {
  product: LivePinnedProduct
  canUnpin?: boolean
  onUnpin?: (productId: string) => void
  featured?: boolean
  liveId?: string
  trackBuyClicks?: boolean
}) {
  const router = useRouter()
  const [buying, setBuying] = useState(false)

  const goBuy = async () => {
    if (buying) return
    setBuying(true)
    const href = productHref(product.productId)
    try {
      if (trackBuyClicks && liveId) {
        await reportLiveBuyClickApi(liveId, product.productId).catch(() => undefined)
      }
    } finally {
      router.push(href)
    }
  }

  return (
    <div
      className={cn(
        "relative flex w-full shrink-0 snap-center flex-col gap-2.5 rounded-2xl bg-black/75 p-3 text-white shadow-lg ring-1 backdrop-blur-md",
        featured ? "ring-amber-300/50" : "ring-white/15"
      )}
    >
      <div className="flex items-stretch gap-3">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-white/10">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-white/60" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-amber-300">
            {formatPrice(product)}
          </p>
        </div>
        {canUnpin && onUnpin ? (
          <button
            type="button"
            onClick={() => onUnpin(product.productId)}
            className="absolute right-2 top-2 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Quitar producto"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        disabled={buying}
        onClick={() => void goBuy()}
        className="flex w-full items-center justify-center rounded-full bg-amber-400 py-2.5 text-sm font-bold text-servido-950 shadow-md active:scale-[0.99] disabled:opacity-70"
      >
        Comprar ahora
      </button>
    </div>
  )
}

/** Carousel de productos fijados (viewer + host). */
export function LivePinBar({
  product,
  products,
  className,
  onUnpin,
  canUnpin,
  onFocus,
  liveId,
  trackBuyClicks = false,
}: {
  /** Compat: un solo producto */
  product?: LivePinnedProduct | null
  products?: LivePinnedProduct[]
  className?: string
  onUnpin?: (productId: string) => void
  canUnpin?: boolean
  /** Host: al cambiar de slide, enfocar ese producto */
  onFocus?: (productId: string) => void
  liveId?: string
  /** Solo viewers: cuenta clics en Comprar para métricas del host */
  trackBuyClicks?: boolean
}) {
  const list =
    products && products.length > 0
      ? products
      : product
        ? [product]
        : []

  const [index, setIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (list.length === 0) {
      setIndex(0)
      return
    }
    setIndex((i) => Math.min(i, list.length - 1))
  }, [list.length])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const child = el.children[index] as HTMLElement | undefined
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [index])

  if (list.length === 0) return null

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(list.length - 1, next))
    setIndex(clamped)
    const id = list[clamped]?.productId
    if (id) onFocus?.(id)
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget
          const w = el.clientWidth || 1
          const i = Math.round(el.scrollLeft / Math.max(w * 0.85, 1))
          const next = Math.max(0, Math.min(list.length - 1, i))
          if (next !== index) setIndex(next)
        }}
      >
        {list.map((p, i) => (
          <div key={p.productId} className="w-[min(100%,20rem)] shrink-0">
            <PinCard
              product={p}
              canUnpin={canUnpin}
              onUnpin={onUnpin}
              featured={i === index}
              liveId={liveId}
              trackBuyClicks={trackBuyClicks}
            />
          </div>
        ))}
      </div>

      {list.length > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="rounded-full bg-black/45 p-1.5 text-white disabled:opacity-30"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {list.map((p, i) => (
              <button
                key={p.productId}
                type="button"
                aria-label={`Producto ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-4 bg-amber-400" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index >= list.length - 1}
            className="rounded-full bg-black/45 p-1.5 text-white disabled:opacity-30"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
