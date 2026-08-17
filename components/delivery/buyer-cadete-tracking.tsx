"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { MapPin, Navigation, Radio } from "lucide-react"
import { isNativeCapacitor } from "@/lib/native-platform"
import { hasValidCoordinates } from "@/lib/geo"
import type { CadeteLiveLocation } from "@/types/restaurant"

function osmEmbedUrl(lat: number, lng: number) {
  const d = 0.008
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function formatUpdatedAt(iso: string, locale: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString(locale === "pt-BR" ? "pt-BR" : "es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function BuyerCadeteTracking(props: {
  liveLocation?: CadeteLiveLocation | null
  cadeteName?: string | null
  locale: string
}) {
  const t = useTranslations("foodOrders")
  const [nativeApp, setNativeApp] = useState(false)
  const loc = props.liveLocation
  const hasFix = Boolean(loc && hasValidCoordinates(loc.lat, loc.lng))
  const showMap = nativeApp && hasFix

  useEffect(() => {
    setNativeApp(isNativeCapacitor())
  }, [])
  const updated = loc?.updatedAt ? formatUpdatedAt(loc.updatedAt, props.locale) : null

  return (
    <div className="mt-4 space-y-2 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
      <p className="flex items-center gap-2 text-sm font-semibold text-sky-900">
        <Radio className="h-4 w-4" />
        {hasFix ? t("trackingLive") : t("trackingWaiting")}
      </p>
      {props.cadeteName && (
        <p className="text-xs text-sky-800/80">{t("trackingCadete", { name: props.cadeteName })}</p>
      )}
      {updated && <p className="text-xs text-sky-700">{t("trackingUpdated", { time: updated })}</p>}
      {showMap && loc && (
        <div className="overflow-hidden rounded-xl ring-1 ring-sky-200">
          <iframe
            title={t("trackingMapTitle")}
            src={osmEmbedUrl(loc.lat, loc.lng)}
            className="h-48 w-full border-0"
            loading="lazy"
          />
        </div>
      )}
      {!showMap && hasFix && <p className="text-xs text-sky-800">{t("trackingWebHint")}</p>}
      {hasFix && loc && (
        <a
          href={mapsUrl(loc.lat, loc.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-sky-800 underline"
        >
          {showMap ? <MapPin className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
          {t("trackingOpenMaps")}
        </a>
      )}
    </div>
  )
}
