import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { SimpleImage } from "@/components/ui/simple-image"
import { formatPrice } from "@/lib/utils"
import { ShoppingBag, Sparkles, Star } from "lucide-react"

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
  badge,
}: HomeProductCardProps) {
  const src =
    (media && media.length > 0 && media[0].url) ||
    imageUrl ||
    `/placeholder.svg?height=200&width=200&query=${imageQuery || name}`

  return (
    <Link href={`/product/${id}`} className="group block h-full">
      <Card className="home-product-card product-card-fixed overflow-hidden border-0 bg-white shadow-md ring-1 ring-gray-100/80">
        <div className="product-image-container relative overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50/40">
          {badge && (
            <span
              className={`absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ${
                badge === "new"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : "bg-gradient-to-r from-amber-500 to-orange-500"
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
            className="product-image transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute top-2 right-2 flex flex-col gap-1">
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
          </div>
        </div>
        <CardContent className="flex h-[120px] flex-col justify-between border-t border-gray-50 p-4">
          <h3 className="product-title text-sm font-medium text-gray-800 transition-colors group-hover:text-purple-700">
            {name}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-purple-700">{formatPrice(price)}</p>
            <span className="flex h-9 w-9 scale-90 items-center justify-center rounded-full bg-purple-600 text-white opacity-0 shadow-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <ShoppingBag className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
