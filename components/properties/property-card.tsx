"use client"

import Link from "next/link"
import { SimpleImage } from "@/components/ui/simple-image"
import { useLocale, useTranslations } from "next-intl"
import { Bath, BedDouble, MapPin, Maximize2, Play } from "lucide-react"
import { formatPropertyPrice } from "@/lib/properties/format-property-price"
import type { PropertyListing } from "@/types/property-listing"
import { cn } from "@/lib/utils"

interface PropertyCardProps {
  listing: PropertyListing
  index?: number
  selected?: boolean
  onHover?: () => void
}

export function PropertyCard({ listing, selected = false, onHover }: PropertyCardProps) {
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
        "overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md",
        selected ? "border-servido-600 ring-1 ring-servido-600" : "border-slate-200"
      )}
      onMouseEnter={onHover}
    >
      <Link
        href={`/propiedades/${listing.id}`}
        className="flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-servido-600 sm:flex-row"
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-200 sm:aspect-auto sm:w-[42%] sm:min-h-[188px] lg:w-[280px]">
          <SimpleImage src={thumb} alt={listing.title} className="h-full w-full object-cover" />
          {hasVideo && (
            <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-servido-800 shadow">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
          <span className="absolute left-2 top-2 rounded bg-servido-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {t(`operation.${listing.operation}`)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3 sm:px-4 sm:py-3.5">
          <p className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            {formatPropertyPrice(listing.price, listing.priceCurrency, locale)}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">{listing.priceCurrency}</span>
          </p>
          {listing.expenses != null && listing.expenses > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">
              {t("expensesFrom")} {formatPropertyPrice(listing.expenses, listing.priceCurrency, locale)}
            </p>
          )}

          <p className="mt-1 text-xs font-medium text-servido-800">
            {t(`propertyType.${listing.propertyType}`)} {t("inOperation")} {t(`operation.${listing.operation}`).toLowerCase()}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-800 sm:text-[15px]">{listing.title}</h3>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {listing.rooms != null && listing.rooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                {listing.rooms} {t("cardRooms")}
              </span>
            )}
            {listing.bathrooms != null && listing.bathrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 text-slate-400" />
                {listing.bathrooms} {t("cardBathrooms")}
              </span>
            )}
            {listing.coveredM2 != null && listing.coveredM2 > 0 && (
              <span className="inline-flex items-center gap-1">
                <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                {listing.coveredM2} m²
              </span>
            )}
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
