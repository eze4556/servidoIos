"use client"

import Link from "next/link"
import { ShoppingBag, X } from "lucide-react"
import type { LivePinnedProduct } from "@/types/live"
import { productHref } from "@/lib/routes"
import { cn } from "@/lib/utils"

export function LivePinBar({
  product,
  className,
  onUnpin,
  canUnpin,
}: {
  product: LivePinnedProduct
  className?: string
  onUnpin?: () => void
  canUnpin?: boolean
}) {
  const priceLabel = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: product.currency || "ARS",
    maximumFractionDigits: 0,
  }).format(product.price || 0)

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-black/70 p-2.5 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md",
        className
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-white/60" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.title}</p>
        <p className="text-xs text-white/80">{priceLabel}</p>
      </div>
      <Link
        href={productHref(product.productId)}
        className="shrink-0 rounded-full bg-amber-400 px-3.5 py-2 text-xs font-bold text-servido-950"
      >
        Comprar
      </Link>
      {canUnpin && onUnpin ? (
        <button
          type="button"
          onClick={onUnpin}
          className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Quitar producto"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
