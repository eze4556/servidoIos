import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"

export function parseBusinessLocation(data: Record<string, unknown> | undefined | null): BusinessLocation | null {
  if (!data) return null

  const nested = data.businessLocation as Record<string, unknown> | undefined
  if (nested && typeof nested.label === "string") {
    const latitude = Number(nested.latitude)
    const longitude = Number(nested.longitude)
    if (hasValidCoordinates(latitude, longitude)) {
      return {
        label: nested.label,
        city: typeof nested.city === "string" ? nested.city : null,
        latitude,
        longitude,
        updatedAt: typeof nested.updatedAt === "number" ? nested.updatedAt : undefined,
      }
    }
  }

  // Fallback: coordinates generales del user (GPS/picker)
  const coordinates = data.coordinates as { latitude?: number; longitude?: number } | undefined
  const location = typeof data.location === "string" ? data.location : ""
  if (location && hasValidCoordinates(coordinates?.latitude, coordinates?.longitude)) {
    return {
      label: location,
      city: null,
      latitude: coordinates!.latitude!,
      longitude: coordinates!.longitude!,
    }
  }

  return null
}

export async function getBusinessLocation(userId: string): Promise<BusinessLocation | null> {
  const userSnap = await getDoc(doc(db, "users", userId))
  if (!userSnap.exists()) return null
  const data = userSnap.data() as Record<string, unknown>

  const fromUser = parseBusinessLocation(data)
  if (fromUser) return fromUser

  if (data.businessType === "restaurant") {
    const restaurantId = (data.restaurantId as string) || userId
    const restSnap = await getDoc(doc(db, "restaurants", restaurantId))
    if (restSnap.exists()) {
      const r = restSnap.data() as Record<string, unknown>
      const coords = r.coordinates as { latitude?: number; longitude?: number } | undefined
      const label =
        (typeof r.locationLabel === "string" && r.locationLabel) ||
        (typeof r.address === "string" && r.address) ||
        ""
      if (label && hasValidCoordinates(coords?.latitude, coords?.longitude)) {
        return {
          label,
          city: typeof r.city === "string" ? r.city : typeof r.zone === "string" ? r.zone : null,
          latitude: coords!.latitude!,
          longitude: coords!.longitude!,
        }
      }
    }
  }

  return null
}

export async function saveBusinessLocation(
  userId: string,
  location: BusinessLocation,
  options?: { restaurantId?: string | null }
): Promise<void> {
  const payload = {
    label: location.label.trim(),
    city: location.city || null,
    latitude: location.latitude,
    longitude: location.longitude,
    updatedAt: Date.now(),
  }

  await updateDoc(doc(db, "users", userId), {
    businessLocation: payload,
    // También actualizamos location/coordinates para reutilizar el resto de la app
    location: payload.label,
    coordinates: { latitude: payload.latitude, longitude: payload.longitude },
    locationSource: "manual",
    lastLocationUpdate: serverTimestamp(),
  })

  if (options?.restaurantId) {
    await updateDoc(doc(db, "restaurants", options.restaurantId), {
      address: payload.label,
      locationLabel: payload.label,
      city: payload.city,
      zone: payload.city || null,
      coordinates: { latitude: payload.latitude, longitude: payload.longitude },
      updatedAt: serverTimestamp(),
    })
  }
}

export interface GeocodeSearchResult {
  label: string
  fullAddress: string
  latitude: number
  longitude: number
  city: string | null
  state: string | null
}

export async function searchPlaces(query: string): Promise<GeocodeSearchResult[]> {
  const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query.trim())}`)
  const data = await response.json()
  return Array.isArray(data.results) ? data.results : []
}
