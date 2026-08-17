"use client"

import { useEffect, useRef, useState } from "react"
import {
  publishCadeteLiveLocation,
  shouldPublishLiveLocation,
  shouldTrackCadeteStatus,
  watchCadetePosition,
  type GeoWatchHandle,
} from "@/lib/cadete-live-location"
import type { CadeteLiveLocation, FoodOrderStatus } from "@/types/restaurant"

export function useCadeteLiveTracking(params: {
  orderId: string | null
  status: FoodOrderStatus | null
  enabled: boolean
}) {
  const lastPublishedRef = useRef<CadeteLiveLocation | null>(null)
  const publishingRef = useRef(false)
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!params.enabled || !params.orderId || !shouldTrackCadeteStatus(params.status)) {
      lastPublishedRef.current = null
      setLastCoords(null)
      return
    }

    const orderId = params.orderId
    const handle: GeoWatchHandle = watchCadetePosition(async (coords) => {
      setLastCoords({ lat: coords.lat, lng: coords.lng })
      if (publishingRef.current) return
      if (!shouldPublishLiveLocation(coords, lastPublishedRef.current)) return
      publishingRef.current = true
      try {
        lastPublishedRef.current = await publishCadeteLiveLocation(orderId, coords)
      } catch (err) {
        console.warn("cadete liveLocation:", err)
      } finally {
        publishingRef.current = false
      }
    })

    return () => handle.stop()
  }, [params.enabled, params.orderId, params.status])

  return { lastCoords }
}
