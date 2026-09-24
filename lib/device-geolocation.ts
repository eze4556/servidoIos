import { Capacitor } from "@capacitor/core"
import { Geolocation } from "@capacitor/geolocation"

export type PermissionState = "granted" | "prompt" | "denied" | "unavailable"

export type PreciseCoords = {
  lat: number
  lng: number
  accuracy: number | null
}

const PRECISE_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
} as const

const GOOD_ACCURACY_M = 80
const WATCH_MS = 9000

function isNative() {
  return Capacitor.isNativePlatform()
}

export async function getLocationPermissionState(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const status = await Geolocation.checkPermissions()
      const value = status.location || status.coarseLocation
      if (value === "granted") return "granted"
      if (value === "denied") return "denied"
      return "prompt"
    } catch {
      return "unavailable"
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable"
  if (!navigator.permissions?.query) return "prompt"
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName })
    if (result.state === "granted") return "granted"
    if (result.state === "denied") return "denied"
    return "prompt"
  } catch {
    return "prompt"
  }
}

export async function requestLocationPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const status = await Geolocation.requestPermissions({ permissions: ["location"] })
      const value = status.location || status.coarseLocation
      if (value === "granted") return "granted"
      if (value === "denied") return "denied"
      return "prompt"
    } catch {
      return "denied"
    }
  }
  return getLocationPermissionState()
}

async function readNativeFix(): Promise<PreciseCoords> {
  const pos = await Geolocation.getCurrentPosition(PRECISE_OPTIONS)
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
  }
}

async function readBrowserFix(): Promise<PreciseCoords> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, PRECISE_OPTIONS)
  })
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
  }
}

function isBetter(next: PreciseCoords, prev: PreciseCoords | null) {
  if (!prev) return true
  const nextAcc = next.accuracy ?? 99999
  const prevAcc = prev.accuracy ?? 99999
  return nextAcc + 8 < prevAcc
}

/**
 * GPS de alta precisión. En nativo usa Capacitor (no el WebView, que suele
 * caer en la IP de la compañía). Si el primer fix es grueso, espera un
 * segundo más fino unos segundos.
 */
export async function getPreciseCoords(): Promise<PreciseCoords> {
  if (isNative()) {
    let best = await readNativeFix()
    if ((best.accuracy ?? 99999) <= GOOD_ACCURACY_M) return best

    let watchId: string | undefined
    try {
      watchId = await Geolocation.watchPosition(PRECISE_OPTIONS, (pos, err) => {
        if (err || !pos) return
        const next: PreciseCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        }
        if (isBetter(next, best)) best = next
      })
      await new Promise((resolve) => window.setTimeout(resolve, WATCH_MS))
    } finally {
      if (watchId) void Geolocation.clearWatch({ id: watchId })
    }
    return best
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("no-geolocation")
  }
  return readBrowserFix()
}
