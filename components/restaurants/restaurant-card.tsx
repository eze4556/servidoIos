"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"
import { DELIVERY_MODE_LABELS, getRestaurantCoverUrl, getRestaurantLogoUrl } from "@/types/restaurant"
import { formatPriceNumber } from "@/lib/utils"

interface RestaurantCardProps {
  restaurant: Restaurant
  categories?: string[]
  minPrice?: number | null
}

export function RestaurantCard({ restaurant, categories = [], minPrice }: RestaurantCardProps) {
  const coverUrl = getRestaurantCoverUrl(restaurant)
  const logoUrl = getRestaurantLogoUrl(restaurant)

  return (
    <Link
      href={`/restaurantes/${restaurant.id}`}
      className="group flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:block sm:p-0"
    >
      <div className="relative h-28 w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-500 sm:h-32 sm:w-full sm:rounded-none">
        {coverUrl ? (
          <Image src={coverUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute bottom-2 left-2 h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-red-500 ring-2 ring-white shadow sm:-bottom-6 sm:left-4 sm:h-14 sm:w-14 sm:ring-4">
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-white sm:h-6 sm:w-6" />
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 py-1 sm:p-4 sm:pt-8">
        <h3 className="truncate font-semibold text-gray-900 group-hover:text-servido-800">
          {restaurant.name}
        </h3>
        {restaurant.description && (
          <p className="line-clamp-1 text-xs text-gray-500 sm:line-clamp-2 sm:text-sm">
            {restaurant.description}
          </p>
        )}
        {categories.length > 0 && (
          <p className="line-clamp-1 text-xs text-gray-500">
            {categories.slice(0, 3).join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 sm:text-xs">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{restaurant.zone || restaurant.address}</span>
          </span>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">
            {DELIVERY_MODE_LABELS[restaurant.deliveryMode]}
          </span>
        </div>
        {typeof minPrice === "number" && (
          <p className="text-xs font-semibold text-servido-800">
            Desde ${formatPriceNumber(minPrice)}
          </p>
        )}
      </div>
    </Link>
  )
}
