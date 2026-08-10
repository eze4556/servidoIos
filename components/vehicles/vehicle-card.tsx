"use client"

import Link from "next/link"
import { SimpleImage } from "@/components/ui/simple-image"
import { useLocale, useTranslations } from "next-intl"
import { Calendar, MapPin, Gauge } from "lucide-react"
import { formatVehiclePrice } from "@/lib/vehicles/format-vehicle-price"
import type { VehicleListing } from "@/types/vehicle-listing"
import { cn } from "@/lib/utils"

interface VehicleCardProps {
  listing: VehicleListing
  index?: number
}

const badgeBase =
  "absolute z-[1] max-w-[48%] truncate rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase leading-tight tracking-wide sm:max-w-[45%] sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]"

export function VehicleCard({ listing, index = 0 }: VehicleCardProps) {
  const t = useTranslations("vehicles")
  const locale = useLocale()
  const thumb = listing.media?.[0]?.url || "/placeholder.svg?height=200&width=300"
  const location = [listing.city, listing.province].filter(Boolean).join(", ")
  const mileageLabel =
    listing.condition === "0km"
      ? t("condition.0km")
      : listing.mileageKm != null
        ? `${listing.mileageKm.toLocaleString(locale)} km`
        : null

  return (
    <article
      className={cn(
        "vehicles-card-enter group flex flex-col rounded-xl border border-servido-200/80 bg-white shadow-md shadow-servido-950/10 transition duration-300 hover:-translate-y-0.5 hover:border-servido-400 hover:shadow-lg sm:rounded-2xl"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <Link href={`/autos/${listing.id}`} className="flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-servido-500">
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-t-xl bg-servido-900 sm:aspect-[16/10]">
          <SimpleImage
            src={thumb}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-servido-950/90 via-transparent to-servido-950/20" />

          <span className={cn(badgeBase, "left-1.5 top-1.5 bg-servido-800 text-white sm:left-2.5 sm:top-2.5")}>
            {t(`vehicleType.${listing.vehicleType}`)}
          </span>
          <span
            className={cn(
              badgeBase,
              "right-1.5 top-1.5 bg-white text-servido-800 shadow-sm sm:right-2.5 sm:top-2.5"
            )}
          >
            {t(`condition.${listing.condition}`)}
          </span>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-servido-950/95 to-transparent px-1.5 pb-1.5 pt-6 sm:px-3 sm:pb-3 sm:pt-8">
            <div className="flex items-end justify-between gap-1">
              <p className="min-w-0 flex-1 truncate text-[11px] font-bold leading-normal text-white sm:text-lg md:text-xl">
                {formatVehiclePrice(listing.price, listing.priceCurrency, locale)}
              </p>
              <span className="shrink-0 rounded bg-white/95 px-1 py-0.5 text-[8px] font-bold leading-normal text-servido-800 sm:px-1.5 sm:text-[9px]">
                {listing.priceCurrency}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-b-xl bg-white px-2.5 pb-3.5 pt-2 sm:px-3 sm:pb-4 sm:pt-2.5">
          <h3 className="mb-2 line-clamp-2 text-[11px] font-semibold leading-[1.35] text-servido-900 sm:text-sm md:text-base">
            {listing.title}
          </h3>

          <div className="space-y-2 border-t border-servido-100 pt-2 text-servido-700">
            <div className="flex min-h-[1.25rem] items-center gap-1.5 text-[11px] sm:text-xs">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-servido-600" aria-hidden />
              <span className="leading-5">{listing.year}</span>
            </div>

            {mileageLabel ? (
              <div className="flex min-h-[1.25rem] items-center gap-1.5 text-[11px] sm:text-xs">
                <Gauge className="h-3.5 w-3.5 shrink-0 text-servido-600" aria-hidden />
                <span className="whitespace-nowrap text-[11px] font-medium leading-5 text-servido-800 sm:text-xs">
                  {mileageLabel}
                </span>
              </div>
            ) : null}

            <div className="flex items-start gap-1.5 text-[10px] leading-snug text-servido-600 sm:text-[11px]">
              <MapPin className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-2 break-words leading-snug">{location || listing.locationLabel}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}
