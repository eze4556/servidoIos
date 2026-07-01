export interface CachedLocation {
  location: string
  latitude: number
  longitude: number
  updatedAt: number
}

const CACHE_KEY = "servido:location"
const DENIED_KEY = "servido:location-denied"
const TTL_MS = 24 * 60 * 60 * 1000

export function readLocationCache(): CachedLocation | null {
  if (typeof window === "undefined") return null

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw) as CachedLocation
    if (!data?.location || typeof data.updatedAt !== "number") return null

    return data
  } catch {
    return null
  }
}

export function writeLocationCache(data: CachedLocation): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    localStorage.removeItem(DENIED_KEY)
  } catch (error) {
    console.error("Error saving location cache:", error)
  }
}

export function isCacheFresh(cache: CachedLocation): boolean {
  return Date.now() - cache.updatedAt < TTL_MS
}

export function markLocationDenied(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(DENIED_KEY, "1")
  } catch {
    // ignore
  }
}

export function wasLocationDenied(): boolean {
  if (typeof window === "undefined") return false

  try {
    return localStorage.getItem(DENIED_KEY) === "1"
  } catch {
    return false
  }
}

export function clearLocationDenied(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(DENIED_KEY)
  } catch {
    // ignore
  }
}

const LEGACY_CACHE_KEYS = ["servido:guest-location"]

export function migrateLegacyLocationCache(): CachedLocation | null {
  if (typeof window === "undefined") return null

  const current = readLocationCache()
  if (current) return current

  for (const key of LEGACY_CACHE_KEYS) {
    try {
      const legacyValue = localStorage.getItem(key)
      if (!legacyValue) continue

      const migrated: CachedLocation = {
        location: legacyValue,
        latitude: 0,
        longitude: 0,
        updatedAt: Date.now(),
      }
      writeLocationCache(migrated)
      localStorage.removeItem(key)
      return migrated
    } catch {
      // try next key
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith("servido:user-location:")) continue

      const legacyValue = localStorage.getItem(key)
      if (!legacyValue) continue

      const migrated: CachedLocation = {
        location: legacyValue,
        latitude: 0,
        longitude: 0,
        updatedAt: Date.now(),
      }
      writeLocationCache(migrated)
      localStorage.removeItem(key)
      return migrated
    }
  } catch {
    // ignore
  }

  return null
}
