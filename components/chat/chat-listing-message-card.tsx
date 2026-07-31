"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePriceFormat } from "@/hooks/use-price-format"

export function ChatListingMessageCard({
  title,
  imageUrl,
  price,
  productId,
  labels,
}: {
  title: string
  imageUrl?: string | null
  price?: number | null
  productId: string
  labels: {
    badge: string
    viewProduct: string
    buyNow: string
  }
}) {
  const { formatPrice } = usePriceFormat()
  const productHref = `/product/${productId}?buy=1`

  return (
    <div className="min-w-[220px] max-w-[260px] overflow-hidden rounded-xl border border-servido-200/60 bg-white">
      {imageUrl && (
        <div className="relative h-32 w-full bg-gray-100">
          <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="space-y-2 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-servido-700">{labels.badge}</p>
        <p className="text-sm font-semibold leading-snug text-gray-900">{title}</p>
        {typeof price === "number" && (
          <p className="text-base font-bold text-servido-800">{formatPrice(price)}</p>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="h-9 w-full rounded-full text-xs">
            <Link href={`/product/${productId}`}>{labels.viewProduct}</Link>
          </Button>
          <Button asChild size="sm" className="h-9 w-full rounded-full bg-servido-800 text-xs hover:bg-servido-900">
            <Link href={productHref}>{labels.buyNow}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
