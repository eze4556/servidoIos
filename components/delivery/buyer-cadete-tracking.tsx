"use client"

import { useTranslations } from "next-intl"
import { MapPin, Navigation, Radio } from "lucide-react"
import { hasValidCoordinates } from "@/lib/geo"
import { CadeteRouteMap } from "@/components/delivery/cadete-route-map"
import type { CadeteLiveLocation, CadeteRoutePoint } from "@/types/restaurant"

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
  liveRoute?: CadeteRoutePoint[] | null
  restaurantLat?: number | null
  restaurantLng?: number | null
  deliveryLat?: number | null
  deliveryLng?: number | null
  cadeteName?: string | null
  locale: string
}) {
  const t = useTranslations("foodOrders")
  const loc = props.liveLocation
  const hasFix = Boolean(loc && hasValidCoordinates(loc.lat, loc.lng))
  const routeCount = Array.isArray(props.liveRoute) ? props.liveRoute.length : 0
  const showMap =
    hasFix ||
    routeCount > 0 ||
    (hasValidCoordinates(Number(props.restaurantLat), Number(props.restaurantLng)) &&
      hasValidCoordinates(Number(props.deliveryLat), Number(props.deliveryLng)))
  const updated = loc?.updatedAt ? formatUpdatedAt(loc.updatedAt, props.locale) : null

  const restaurant =
    hasValidCoordinates(Number(props.restaurantLat), Number(props.restaurantLng))
      ? { lat: Number(props.restaurantLat), lng: Number(props.restaurantLng) }
      : null
  const delivery =
    hasValidCoordinates(Number(props.deliveryLat), Number(props.deliveryLng))
      ? { lat: Number(props.deliveryLat), lng: Number(props.deliveryLng) }
      : null

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
      {routeCount > 1 && (
        <p className="text-xs text-sky-700">{t("trackingRoutePoints", { count: routeCount })}</p>
      )}
      {showMap && (
        <div className="overflow-hidden rounded-xl ring-1 ring-sky-200">
          <CadeteRouteMap
            liveLocation={loc}
            liveRoute={props.liveRoute}
            restaurant={restaurant}
            delivery={delivery}
            className="h-56 w-full"
          />
        </div>
      )}
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
