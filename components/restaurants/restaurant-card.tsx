"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"
import { DELIVERY_MODE_LABELS } from "@/types/restaurant"

interface RestaurantCardProps {
  restaurant: Restaurant
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurantes/${restaurant.id}`}
      className="group flex gap-4 rounded-2xl bg-white p-4 shadow-md shadow-black/[0.06] ring-1 ring-black/[0.04] transition-all hover:shadow-lg"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
        {restaurant.imageUrl ? (
          <Image src={restaurant.imageUrl} alt={restaurant.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-servido-800">{restaurant.name}</h3>
        {restaurant.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{restaurant.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
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
