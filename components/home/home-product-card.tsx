"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { SimpleImage } from "@/components/ui/simple-image"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useTranslations } from "next-intl"
import { ArrowUpRight, Sparkles, Star } from "lucide-react"

interface HomeProductCardProps {
  id: string
  name: string
  price: number
  imageUrl?: string
  imageQuery?: string
  media?: { url: string; type: string }[]
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
  allowResellerShare?: boolean
  badge?: "featured" | "new"
}

export function HomeProductCard({
  id,
  name,
  price,
  imageUrl,
  imageQuery,
  media,
  condition,
  freeShipping,
  shippingCost,
  allowResellerShare,
  badge,
}: HomeProductCardProps) {
  const { formatPrice } = usePriceFormat()
  const tReseller = useTranslations("resellerProgram")
  const src =
    (media && media.length > 0 && media[0].url) ||
    imageUrl ||
    `/placeholder.svg?height=200&width=200&query=${imageQuery || name}`

  return (
    <Link href={`/product/${id}`} className="group block h-full">
      <Card className="home-product-card product-card-fixed overflow-hidden rounded-2xl border-0 bg-white shadow-[0_10px_30px_-18px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 lg:rounded-3xl">
        <div className="product-image-container relative overflow-hidden bg-gradient-to-br from-slate-50 to-servido-50/50">
          {badge && (
            <span
              className={`absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ${
                badge === "new"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : "bg-gradient-to-r from-amber-400 to-orange-500"
              }`}
            >
              {badge === "new" ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  Nuevo
                </>
              ) : (
                <>
                  <Star className="h-3 w-3 fill-current" />
                  Top
                </>
              )}
            </span>
          )}
          <SimpleImage
            src={src}
            alt={name}
            className="product-image transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-servido-950/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
            {condition && (
              <span
                className={`product-badge rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ${
                  condition === "nuevo" ? "product-badge-new" : "product-badge-used"
                }`}
              >
                {condition === "nuevo" ? "NUEVO" : "USADO"}
              </span>
            )}
            {freeShipping ? (
              <span className="product-badge product-badge-shipping rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                ENVÍO GRATIS
              </span>
            ) : shippingCost !== undefined ? (
              <span className="product-badge product-badge-cost rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                ENVÍO ${shippingCost}
              </span>
            ) : null}
            {allowResellerShare && (
              <span className="max-w-[92%] truncate rounded-full bg-servido-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                {tReseller("badgeShort")}
              </span>
            )}
          </div>
        </div>
        <CardContent className="flex h-[120px] flex-col justify-between border-t border-servido-950/[0.04] p-4">
          <h3 className="product-title line-clamp-2 text-sm font-medium text-servido-950/80 transition-colors group-hover:text-servido-800">
            {name}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold tracking-tight text-servido-800">{formatPrice(price)}</p>
            <span className="flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-servido-gold text-servido-950 opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
