export interface BusinessLocation {
  label: string
  city: string | null
  latitude: number
  longitude: number
  updatedAt?: number
}

/** Radio para mostrar historias cercanas */
export const STORY_NEARBY_RADIUS_KM = 50

export function hasValidCoordinates(latitude?: number | null, longitude?: number | null): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false
  if (latitude === 0 && longitude === 0) return false
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

/** Distancia en km (Haversine). */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
