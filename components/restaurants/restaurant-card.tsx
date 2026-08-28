"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { MapPin, UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"
import { getRestaurantCoverUrl, getRestaurantLogoUrl } from "@/types/restaurant"
import { getDeliveryModeLabel } from "@/lib/i18n/restaurant-labels"
import { usePriceFormat } from "@/hooks/use-price-format"
import { restaurantHref } from "@/lib/routes"

interface RestaurantCardProps {
  restaurant: Restaurant
  categories?: string[]
  minPrice?: number | null
}

export function RestaurantCard({ restaurant, categories = [], minPrice }: RestaurantCardProps) {
  const t = useTranslations("restaurants")
  const { formatPrice } = usePriceFormat()
  const coverUrl = getRestaurantCoverUrl(restaurant)
  const logoUrl = getRestaurantLogoUrl(restaurant)

  return (
    <Link
      href={restaurantHref(restaurant.id)}
      className="group flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition-all hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(46,16,101,0.35)] sm:block sm:p-0 lg:rounded-3xl"
    >
      <div className="relative h-28 w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-servido-800 to-servido-950 sm:h-36 sm:w-full sm:rounded-none lg:h-40">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-servido-950/45 to-transparent" />
        <div className="absolute bottom-2 left-2 h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-servido-700 to-servido-950 ring-2 ring-white shadow sm:-bottom-6 sm:left-4 sm:h-14 sm:w-14 sm:ring-4">
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-servido-gold sm:h-6 sm:w-6" />
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 py-1 sm:p-4 sm:pt-8">
        <h3 className="truncate font-semibold text-servido-950 transition-colors group-hover:text-servido-800">
          {restaurant.name}
        </h3>
        {restaurant.description && (
          <p className="line-clamp-1 text-xs text-slate-500 sm:line-clamp-2 sm:text-sm">
            {restaurant.description}
          </p>
        )}
        {categories.length > 0 && (
          <p className="line-clamp-1 text-xs text-slate-500">
            {categories.slice(0, 3).join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 text-servido-800/60" />
            <span className="truncate">{restaurant.zone || restaurant.address}</span>
          </span>
          <span className="rounded-full bg-servido-50 px-2 py-0.5 font-medium text-servido-800">
            {getDeliveryModeLabel(t, restaurant.deliveryMode)}
          </span>
        </div>
        {typeof minPrice === "number" && (
          <p className="text-xs font-semibold text-servido-800">
            {t("fromPrice", { price: formatPrice(minPrice) })}
          </p>
        )}
      </div>
    </Link>
  )
}
