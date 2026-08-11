"use client"

import Link from "next/link"
import { SimpleImage } from "@/components/ui/simple-image"
import { useLocale, useTranslations } from "next-intl"
import { MapPin, Maximize2, BedDouble, Play } from "lucide-react"
import { formatPropertyPrice } from "@/lib/properties/format-property-price"
import type { PropertyListing } from "@/types/property-listing"
import { cn } from "@/lib/utils"

interface PropertyCardProps {
  listing: PropertyListing
  index?: number
}

const badgeBase =
  "absolute z-[1] max-w-[48%] truncate rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase leading-tight tracking-wide sm:max-w-[45%] sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]"

export function PropertyCard({ listing, index = 0 }: PropertyCardProps) {
  const t = useTranslations("properties")
  const locale = useLocale()
  const thumb =
    listing.media.find((m) => m.type === "image")?.url ||
    listing.media.find((m) => m.type === "video")?.url ||
    "/placeholder.svg?height=200&width=300"
  const hasVideo = listing.media.some((m) => m.type === "video")
  const location = [listing.neighborhood, listing.city, listing.province].filter(Boolean).join(", ")

  return (
    <article
      className={cn(
        "vehicles-card-enter group flex flex-col rounded-xl border border-servido-200/80 bg-white shadow-md shadow-servido-950/10 transition duration-300 hover:-translate-y-0.5 hover:border-servido-400 hover:shadow-lg sm:rounded-2xl"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <Link href={`/propiedades/${listing.id}`} className="flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-servido-500">
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-t-xl bg-servido-900 sm:aspect-[16/10]">
          <SimpleImage src={thumb} alt={listing.title} className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-servido-950/90 via-transparent to-servido-950/20" />

          <span className={cn(badgeBase, "left-1.5 top-1.5 bg-servido-800 text-white sm:left-2.5 sm:top-2.5")}>
            {t(`propertyType.${listing.propertyType}`)}
          </span>
          <span className={cn(badgeBase, "right-1.5 top-1.5 bg-white text-servido-800 shadow-sm sm:right-2.5 sm:top-2.5")}>
            {t(`operation.${listing.operation}`)}
          </span>
          {hasVideo && (
            <span className="absolute bottom-12 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-servido-800 shadow sm:bottom-14">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-servido-950/95 to-transparent px-1.5 pb-1.5 pt-6 sm:px-3 sm:pb-3 sm:pt-8">
            <div className="flex items-end justify-between gap-1">
              <p className="min-w-0 flex-1 truncate text-[11px] font-bold leading-normal text-white sm:text-lg">
                {formatPropertyPrice(listing.price, listing.priceCurrency, locale)}
              </p>
              <span className="shrink-0 rounded bg-white/95 px-1 py-0.5 text-[8px] font-bold text-servido-800">
                {listing.priceCurrency}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-b-xl bg-white px-2.5 pb-3.5 pt-2 sm:px-3 sm:pb-4">
          <h3 className="mb-2 line-clamp-2 text-[11px] font-semibold leading-[1.35] text-servido-900 sm:text-sm">
            {listing.title}
          </h3>
          <div className="space-y-1.5 border-t border-servido-100 pt-2 text-[10px] text-servido-700 sm:text-xs">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {listing.rooms != null && listing.rooms > 0 && (
                <span className="inline-flex items-center gap-1 leading-5">
                  <BedDouble className="h-3.5 w-3.5 text-servido-600" />
                  {listing.rooms} {t("cardRooms")}
                </span>
              )}
              {listing.coveredM2 != null && listing.coveredM2 > 0 && (
                <span className="inline-flex items-center gap-1 leading-5">
                  <Maximize2 className="h-3.5 w-3.5 text-servido-600" />
                  {listing.coveredM2} m²
                </span>
              )}
            </div>
            <div className="flex items-start gap-1.5 text-servido-600">
              <MapPin className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2 leading-snug">{location || listing.locationLabel}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}
