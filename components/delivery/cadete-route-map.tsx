"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { hasValidCoordinates } from "@/lib/geo"
import type { CadeteLiveLocation, CadeteRoutePoint } from "@/types/restaurant"

type LatLng = { lat: number; lng: number }

function toLatLngs(route: CadeteRoutePoint[] | null | undefined, live?: CadeteLiveLocation | null): LatLng[] {
  const points: LatLng[] = []
  for (const point of route || []) {
    if (hasValidCoordinates(point.lat, point.lng)) {
      points.push({ lat: point.lat, lng: point.lng })
    }
  }
  if (live && hasValidCoordinates(live.lat, live.lng)) {
    const last = points[points.length - 1]
    if (!last || last.lat !== live.lat || last.lng !== live.lng) {
      points.push({ lat: live.lat, lng: live.lng })
    }
  }
  return points
}

export function CadeteRouteMap(props: {
  liveLocation?: CadeteLiveLocation | null
  liveRoute?: CadeteRoutePoint[] | null
  restaurant?: LatLng | null
  delivery?: LatLng | null
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const layersRef = useRef<{
    route?: import("leaflet").Polyline
    cadete?: import("leaflet").Marker
    restaurant?: import("leaflet").Marker
    delivery?: import("leaflet").Marker
  }>({})
  const [mapReady, setMapReady] = useState(0)

  const path = useMemo(
    () => toLatLngs(props.liveRoute, props.liveLocation),
    [props.liveRoute, props.liveLocation]
  )

  useEffect(() => {
    let cancelled = false

    async function setup() {
      if (!containerRef.current || mapRef.current) return
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      if (cancelled || !containerRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map)
      L.control.zoom({ position: "bottomright" }).addTo(map)
      mapRef.current = map
      setMapReady((n) => n + 1)
    }

    void setup()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layersRef.current = {}
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    void import("leaflet").then(({ default: L }) => {
      const bounds: import("leaflet").LatLngExpression[] = []

      if (layersRef.current.route) {
        map.removeLayer(layersRef.current.route)
        layersRef.current.route = undefined
      }
      if (path.length >= 2) {
        layersRef.current.route = L.polyline(
          path.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#0284c7", weight: 4, opacity: 0.85 }
        ).addTo(map)
        path.forEach((p) => bounds.push([p.lat, p.lng]))
      } else if (path.length === 1) {
        bounds.push([path[0].lat, path[0].lng])
      }

      const upsertMarker = (
        key: "cadete" | "restaurant" | "delivery",
        point: LatLng | null | undefined,
        color: string
      ) => {
        if (layersRef.current[key]) {
          map.removeLayer(layersRef.current[key]!)
          layersRef.current[key] = undefined
        }
        if (!point || !hasValidCoordinates(point.lat, point.lng)) return
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        layersRef.current[key] = L.marker([point.lat, point.lng], { icon }).addTo(map)
        bounds.push([point.lat, point.lng])
      }

      const cadetePoint =
        props.liveLocation && hasValidCoordinates(props.liveLocation.lat, props.liveLocation.lng)
          ? { lat: props.liveLocation.lat, lng: props.liveLocation.lng }
          : path[path.length - 1] || null

      upsertMarker("restaurant", props.restaurant, "#0f766e")
      upsertMarker("delivery", props.delivery, "#b45309")
      upsertMarker("cadete", cadetePoint, "#0369a1")

      if (bounds.length === 1) {
        map.setView(bounds[0] as [number, number], 15)
      } else if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 16 })
      }

      window.setTimeout(() => map.invalidateSize(), 80)
    })
  }, [mapReady, path, props.liveLocation, props.restaurant, props.delivery])

  return <div ref={containerRef} className={props.className || "h-56 w-full"} />
}
