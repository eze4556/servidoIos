"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Bike, MapPin, UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"
import { getRestaurantCoverUrl, getRestaurantLogoUrl } from "@/types/restaurant"
import { getDeliveryModeLabel, getFoodBusinessKindLabel } from "@/lib/i18n/restaurant-labels"
import { usePriceFormat } from "@/hooks/use-price-format"
import { restaurantHref } from "@/lib/routes"
import { FOOD_BUSINESS_KINDS, type FoodBusinessKind } from "@/types/restaurant"

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
  const kind =
    restaurant.foodBusinessKind &&
    FOOD_BUSINESS_KINDS.includes(restaurant.foodBusinessKind as FoodBusinessKind)
      ? (restaurant.foodBusinessKind as FoodBusinessKind)
      : null

  return (
    <Link
      href={restaurantHref(restaurant.id)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_-18px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/8 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_rgba(46,16,101,0.34)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-servido-800 to-servido-950">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={restaurant.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {kind && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-servido-950 shadow-sm backdrop-blur">
            {getFoodBusinessKindLabel(t, kind)}
          </span>
        )}
        <div className="absolute -bottom-5 left-3 h-12 w-12 overflow-hidden rounded-xl bg-gradient-to-br from-servido-700 to-servido-950 shadow-md ring-2 ring-white sm:h-14 sm:w-14">
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-servido-gold" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-7 sm:px-4 sm:pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-servido-950 group-hover:text-servido-800">
            {restaurant.name}
          </h3>
          {categories.length > 0 ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {categories.slice(0, 3).join(" · ")}
            </p>
          ) : restaurant.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{restaurant.description}</p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500 sm:text-xs">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-servido-800/70" />
            <span className="truncate">{restaurant.zone || restaurant.address}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Bike className="h-3.5 w-3.5 shrink-0 text-servido-800/70" />
            {getDeliveryModeLabel(t, restaurant.deliveryMode)}
          </span>
        </div>

        {typeof minPrice === "number" && (
          <p className="text-sm font-semibold text-servido-900">
            {t("fromPrice", { price: formatPrice(minPrice) })}
          </p>
        )}
      </div>
    </Link>
  )
}
