"use client"

import type { PropertyListing } from "@/types/property-listing"
import { useTranslations } from "next-intl"
import { MapPin } from "lucide-react"

interface PropertyResultsMapProps {
  listings: PropertyListing[]
  selectedId: string | null
}

export function PropertyResultsMap({ listings, selectedId }: PropertyResultsMapProps) {
  const t = useTranslations("properties")
  const withCoords = listings.filter(
    (l) => typeof l.latitude === "number" && typeof l.longitude === "number"
  )
  const selected = withCoords.find((l) => l.id === selectedId) ?? withCoords[0]

  if (!selected || selected.latitude == null || selected.longitude == null) {
    return (
      <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
        {t("mapEmpty")}
      </div>
    )
  }

  const lat = selected.latitude
  const lng = selected.longitude
  const d = 0.03
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`
  const location = [selected.neighborhood, selected.city, selected.province].filter(Boolean).join(", ")

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <iframe title={t("mapTitle")} src={src} className="h-[min(62vh,560px)] w-full border-0" loading="lazy" />
      <div className="flex items-start gap-2 border-t border-slate-100 px-3 py-2.5">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-servido-700" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{selected.title}</p>
          <p className="truncate text-xs text-slate-500">{location || selected.locationLabel}</p>
        </div>
      </div>
    </div>
  )
}
