"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"
import { DELIVERY_MODE_LABELS, getRestaurantCoverUrl, getRestaurantLogoUrl } from "@/types/restaurant"

interface RestaurantCardProps {
  restaurant: Restaurant
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const coverUrl = getRestaurantCoverUrl(restaurant)
  const logoUrl = getRestaurantLogoUrl(restaurant)

  return (
    <Link
      href={`/restaurantes/${restaurant.id}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-md shadow-black/[0.06] ring-1 ring-black/[0.04] transition-all hover:shadow-lg"
    >
      <div className="relative h-28 w-full bg-gradient-to-br from-orange-400 to-red-500">
        {coverUrl ? (
          <Image src={coverUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-red-500 ring-4 ring-white shadow">
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2 p-4 pt-8">
        <h3 className="font-semibold text-gray-900 group-hover:text-servido-800">{restaurant.name}</h3>
        {restaurant.description && (
          <p className="line-clamp-2 text-sm text-gray-500">{restaurant.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {restaurant.zone || restaurant.address}
          </span>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">
            {DELIVERY_MODE_LABELS[restaurant.deliveryMode]}
          </span>
        </div>
      </div>
    </Link>
  )
}
