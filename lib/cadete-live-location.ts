import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { hasValidCoordinates } from "@/lib/geo"
import type { CadeteLiveLocation, FoodOrderStatus } from "@/types/restaurant"

const ACTIVE_TRACKING_STATUSES: FoodOrderStatus[] = ["en_camino", "llegando", "afuera"]

const MIN_INTERVAL_MS = 8000
const MIN_MOVE_METERS = 35

export function shouldTrackCadeteStatus(status?: FoodOrderStatus | null): boolean {
  return Boolean(status && ACTIVE_TRACKING_STATUSES.includes(status))
}

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (n: number) => (n * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function shouldPublishLiveLocation(
  next: { lat: number; lng: number },
  prev: CadeteLiveLocation | null,
  nowMs = Date.now()
): boolean {
  if (!hasValidCoordinates(next.lat, next.lng)) return false
  if (!prev) return true
  const prevMs = Date.parse(prev.updatedAt)
  if (!Number.isFinite(prevMs) || nowMs - prevMs >= MIN_INTERVAL_MS) {
    if (!hasValidCoordinates(prev.lat, prev.lng)) return true
    return metersBetween(prev.lat, prev.lng, next.lat, next.lng) >= MIN_MOVE_METERS || nowMs - prevMs >= 25000
  }
  return metersBetween(prev.lat, prev.lng, next.lat, next.lng) >= MIN_MOVE_METERS * 2
}

export async function publishCadeteLiveLocation(
  orderId: string,
  location: Omit<CadeteLiveLocation, "updatedAt">
): Promise<CadeteLiveLocation> {
  const payload: CadeteLiveLocation = {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
    heading: location.heading ?? null,
    speed: location.speed ?? null,
    updatedAt: new Date().toISOString(),
  }
  await updateDoc(doc(db, "foodOrders", orderId), {
    liveLocation: payload,
    updatedAt: serverTimestamp(),
  })
  return payload
}

export type GeoWatchHandle = { stop: () => void }

type WatchCoords = {
  lat: number
  lng: number
  accuracy?: number | null
  heading?: number | null
  speed?: number | null
}

async function requestGeoPermission() {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return
  try {
    await navigator.permissions.query({ name: "geolocation" as PermissionName })
  } catch {
    // Safari / WebView: el prompt sale en watchPosition
  }
}

async function acquireWakeLock(): Promise<{ release: () => Promise<void> } | null> {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> }
  }
  if (!nav.wakeLock?.request) return null
  try {
    return await nav.wakeLock.request("screen")
  } catch {
    return null
  }
}

export function watchCadetePosition(
  onPosition: (coords: WatchCoords) => void,
  onError?: (message: string) => void
): GeoWatchHandle {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError?.("no-geolocation")
    return { stop: () => undefined }
  }

  void requestGeoPermission()

  const geoOptions: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 20000,
  }

  const emit = (pos: GeolocationPosition) => {
    onPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
      heading: Number.isFinite(pos.coords.heading as number) ? pos.coords.heading : null,
      speed: Number.isFinite(pos.coords.speed as number) ? pos.coords.speed : null,
    })
  }

  const watchId = navigator.geolocation.watchPosition(emit, (err) => {
    onError?.(err.message || "geo-denied")
  }, geoOptions)

  // Con la app en segundo plano el watch se frena: un ping periódico ayuda.
  const backupId = window.setInterval(() => {
    navigator.geolocation.getCurrentPosition(emit, () => undefined, {
      ...geoOptions,
      maximumAge: 15000,
      timeout: 12000,
    })
  }, 20000)

  let wake: { release: () => Promise<void> } | null = null
  void acquireWakeLock().then((lock) => {
    wake = lock
  })

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      navigator.geolocation.getCurrentPosition(emit, () => undefined, geoOptions)
      if (!wake) {
        void acquireWakeLock().then((lock) => {
          wake = lock
        })
      }
    }
  }
  document.addEventListener("visibilitychange", onVisibility)

  return {
    stop: () => {
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(backupId)
      document.removeEventListener("visibilitychange", onVisibility)
      void wake?.release()
    },
  }
}
