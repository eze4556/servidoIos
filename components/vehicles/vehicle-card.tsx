"use client"

import Link from "next/link"
import { SimpleImage } from "@/components/ui/simple-image"
import { useLocale, useTranslations } from "next-intl"
import { Calendar, Gauge, MapPin } from "lucide-react"
import { formatVehiclePrice } from "@/lib/vehicles/format-vehicle-price"
import type { VehicleListing } from "@/types/vehicle-listing"
import { cn } from "@/lib/utils"

interface VehicleCardProps {
  listing: VehicleListing
  index?: number
  selected?: boolean
  onHover?: () => void
}

export function VehicleCard({ listing, selected = false, onHover }: VehicleCardProps) {
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
        "group overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-20px_rgba(46,16,101,0.25)] ring-1 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(46,16,101,0.32)]",
        selected ? "ring-servido-700" : "ring-servido-950/5"
      )}
      onMouseEnter={onHover}
    >
      <Link
        href={`/autos/${listing.id}`}
        className="flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-servido-600 sm:flex-row"
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-200 sm:aspect-auto sm:w-[42%] sm:min-h-[188px] lg:w-[260px]">
          <SimpleImage
            src={thumb}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-2 top-2 rounded-full bg-servido-950 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {t(`condition.${listing.condition}`)}
          </span>
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-servido-800 shadow-sm">
            {t(`vehicleType.${listing.vehicleType}`)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3 sm:px-4 sm:py-3.5">
          <p className="text-lg font-bold leading-tight tracking-tight text-servido-950 sm:text-xl">
            {formatVehiclePrice(listing.price, listing.priceCurrency, locale)}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">{listing.priceCurrency}</span>
          </p>

          <p className="mt-1 text-xs font-medium text-servido-800">
            {listing.make} {listing.model}
            {listing.trim ? ` ${listing.trim}` : ""}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-800 sm:text-[15px]">{listing.title}</h3>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {listing.year}
            </span>
            {mileageLabel && (
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-slate-400" />
                {mileageLabel}
              </span>
            )}
            {listing.fuelType && <span>{t(`fuel.${listing.fuelType}`)}</span>}
            {listing.transmission && <span>{t(`transmission.${listing.transmission}`)}</span>}
          </div>

          <p className="mt-auto flex items-start gap-1 pt-2 text-xs text-slate-500">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-servido-700" />
            <span className="line-clamp-1">{location || listing.locationLabel}</span>
          </p>
        </div>
      </Link>
    </article>
  )
}
