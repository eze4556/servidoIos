"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import {
  clearLocationDenied,
  formatShortLocation,
  isPreciseCacheFresh,
  isPreciseLocation,
  markLocationDenied,
  migrateLegacyLocationCache,
  readLocationCache,
  wasLocationDenied,
  writeLocationCache,
  type CachedLocation,
} from "@/lib/location-cache"
import { hasValidCoordinates } from "@/lib/geo"
import { apiUrl } from "@/lib/api-base"
import { getLocationPermissionState, getPreciseCoords, requestLocationPermission } from "@/lib/device-geolocation"

interface SetManualLocationInput {
  location: string
  latitude?: number
  longitude?: number
}

interface LocationContextType {
  userLocation: string
  shortLocation: string
  loadingLocation: boolean
  locationSource: CachedLocation["source"] | null
  coordinates: { latitude: number; longitude: number } | null
  hasValidLocation: boolean
  pickerOpen: boolean
  openLocationPicker: () => void
  closeLocationPicker: () => void
  refreshLocation: () => Promise<void>
  setManualLocation: (input: SetManualLocationInput) => Promise<void>
  hasPreciseLocation: boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const response = await fetch(apiUrl(`/api/geocoding?lat=${latitude}&lon=${longitude}`))
  const data = await response.json()
  return data.success ? data.location : null
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const [userLocation, setUserLocation] = useState("")
  const [locationSource, setLocationSource] = useState<CachedLocation["source"] | null>(null)
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const hasResolvedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const currentUserRef = useRef(currentUser)

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const applyCachedLocation = useCallback((cache: CachedLocation) => {
    setUserLocation(cache.location)
    setLocationSource(cache.source ?? null)
    if (isPreciseLocation(cache) && hasValidCoordinates(cache.latitude, cache.longitude)) {
      setCoordinates({ latitude: cache.latitude, longitude: cache.longitude })
    } else {
      setCoordinates(null)
    }
    setLoadingLocation(false)
  }, [])

  const saveUserLocation = useCallback(
    async (location: string, latitude: number, longitude: number, source: CachedLocation["source"]) => {
      const user = currentUserRef.current
      if (!user) return

      try {
        const userDocRef = doc(db, "users", user.firebaseUser.uid)
        await updateDoc(userDocRef, {
          location,
          coordinates: { latitude, longitude },
          locationSource: source ?? "manual",
          lastLocationUpdate: new Date(),
        })
      } catch (error) {
        console.error("Error saving user location:", error)
      }
    },
    []
  )

  const persistLocation = useCallback(
    async (
      location: string,
      latitude: number,
      longitude: number,
      source: NonNullable<CachedLocation["source"]>
    ) => {
      writeLocationCache({ location, latitude, longitude, updatedAt: Date.now(), source })
      setUserLocation(location)
      setLocationSource(source)
      if (source !== "ip" && hasValidCoordinates(latitude, longitude)) {
        setCoordinates({ latitude, longitude })
      } else {
        setCoordinates(null)
      }
      setLoadingLocation(false)
      await saveUserLocation(location, latitude, longitude, source)
    },
    [saveUserLocation]
  )

  const resolveFromGps = useCallback(
    async (showLoading = true) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (showLoading) setLoadingLocation(true)

      try {
        const permission = await getLocationPermissionState()
        if (permission === "denied") {
          markLocationDenied()
          setLoadingLocation(false)
          return
        }
        if (permission === "prompt") {
          const next = await requestLocationPermission()
          if (next === "denied") {
            markLocationDenied()
            setLoadingLocation(false)
            return
          }
        }

        const coords = await getPreciseCoords()
        if (!hasValidCoordinates(coords.lat, coords.lng)) {
          setLoadingLocation(false)
          return
        }
        const location = await reverseGeocode(coords.lat, coords.lng)
        await persistLocation(location || "Mi ubicación", coords.lat, coords.lng, "gps")
      } catch (error) {
        const geoError = error as GeolocationPositionError
        if (geoError?.code === 1) {
          markLocationDenied()
        }
        console.error("Error getting location:", error)
        setUserLocation((prev) => prev || "Ubicación no disponible")
        setLoadingLocation(false)
      } finally {
        isFetchingRef.current = false
      }
    },
    [persistLocation]
  )

  /**
   * Ubicación aproximada por IP. Se usa al abrir la app porque no dispara el
   * permiso del sistema: Google Play pide que el permiso de ubicación se
   * solicite a partir de una acción del usuario y con una explicación, no de
   * arranque. El GPS queda detrás del botón del selector de ubicación.
   */
  const resolveFromIp = useCallback(
    async (showLoading = true) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (showLoading) setLoadingLocation(true)

      try {
        const response = await fetch(apiUrl("/api/geolocation"))
        const data = await response.json()
        const location = typeof data?.location === "string" ? data.location : null

        if (data?.success && location) {
          const existing = readLocationCache()
          if (isPreciseLocation(existing)) {
            setLoadingLocation(false)
            return
          }
          await persistLocation(location, 0, 0, "ip")
          return
        }

        setLoadingLocation(false)
      } catch (error) {
        console.error("Error resolving location by IP:", error)
        setLoadingLocation(false)
      } finally {
        isFetchingRef.current = false
      }
    },
    [persistLocation]
  )

  const loadFromFirestore = useCallback(async (): Promise<boolean> => {
    const user = currentUserRef.current
    if (!user) return false

    try {
      const userDocRef = doc(db, "users", user.firebaseUser.uid)
      const userDocSnap = await getDoc(userDocRef)
      if (!userDocSnap.exists()) return false

      const userData = userDocSnap.data()
      const location = userData.location as string | undefined
      const coordinates = userData.coordinates as { latitude?: number; longitude?: number } | undefined
      const source = (userData.locationSource as CachedLocation["source"]) || "profile"

      if (!location) return false

      writeLocationCache({
        location,
        latitude: coordinates?.latitude ?? 0,
        longitude: coordinates?.longitude ?? 0,
        updatedAt: Date.now(),
        source,
      })
      setUserLocation(location)
      setLocationSource(source)
      if (source !== "ip" && hasValidCoordinates(coordinates?.latitude, coordinates?.longitude)) {
        setCoordinates({
          latitude: coordinates!.latitude!,
          longitude: coordinates!.longitude!,
        })
      }
      setLoadingLocation(false)
      return true
    } catch (error) {
      console.error("Error loading location from profile:", error)
      return false
    }
  }, [])

  const initializeLocation = useCallback(async () => {
    const cached = migrateLegacyLocationCache() ?? readLocationCache()
    if (cached) {
      applyCachedLocation(cached)
      if (isPreciseCacheFresh(cached)) {
        hasResolvedRef.current = true
        return
      }
    }

    if (!wasLocationDenied()) {
      await resolveFromGps(!cached)
      const afterGps = readLocationCache()
      if (isPreciseLocation(afterGps)) {
        hasResolvedRef.current = true
        return
      }
    }

    if (currentUserRef.current) {
      const loadedFromProfile = await loadFromFirestore()
      const profileCache = readLocationCache()
      if (loadedFromProfile && isPreciseLocation(profileCache)) {
        hasResolvedRef.current = true
        return
      }
    }

    await resolveFromIp(!cached)
    hasResolvedRef.current = true
  }, [applyCachedLocation, loadFromFirestore, resolveFromGps, resolveFromIp])

  const refreshLocation = useCallback(async () => {
    clearLocationDenied()
    await resolveFromGps(true)
  }, [resolveFromGps])

  const setManualLocation = useCallback(
    async ({ location, latitude = 0, longitude = 0 }: SetManualLocationInput) => {
      const trimmed = location.trim()
      if (!trimmed) return
      clearLocationDenied()
      await persistLocation(trimmed, latitude, longitude, "manual")
      setPickerOpen(false)
    },
    [persistLocation]
  )

  const openLocationPicker = useCallback(() => setPickerOpen(true), [])
  const closeLocationPicker = useCallback(() => setPickerOpen(false), [])

  useEffect(() => {
    const cached = migrateLegacyLocationCache() ?? readLocationCache()
    if (cached) {
      applyCachedLocation(cached)
      if (isPreciseCacheFresh(cached)) {
        hasResolvedRef.current = true
        return
      }
    }

    const runLookup = () => {
      void initializeLocation()
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(runLookup, { timeout: 2000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timer = window.setTimeout(runLookup, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!currentUser || hasResolvedRef.current) return
    if (readLocationCache()) return

    void loadFromFirestore().then((loaded) => {
      if (loaded) hasResolvedRef.current = true
    })
  }, [currentUser, loadFromFirestore])

  const shortLocation = useMemo(() => formatShortLocation(userLocation), [userLocation])
  const hasPreciseLocation = isPreciseLocation({
    location: userLocation,
    latitude: coordinates?.latitude ?? 0,
    longitude: coordinates?.longitude ?? 0,
    updatedAt: Date.now(),
    source: locationSource ?? undefined,
  })
  const hasValidLocation = hasPreciseLocation && hasValidCoordinates(coordinates?.latitude, coordinates?.longitude)

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        shortLocation,
        loadingLocation,
        locationSource,
        coordinates,
        hasValidLocation,
        pickerOpen,
        openLocationPicker,
        closeLocationPicker,
        refreshLocation,
        setManualLocation,
        hasPreciseLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}
