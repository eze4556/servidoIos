"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import {
  clearLocationDenied,
  isCacheFresh,
  markLocationDenied,
  migrateLegacyLocationCache,
  readLocationCache,
  wasLocationDenied,
  writeLocationCache,
  type CachedLocation,
} from "@/lib/location-cache"

interface LocationContextType {
  userLocation: string
  loadingLocation: boolean
  refreshLocation: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const FAST_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 30 * 60 * 1000,
}

const PRECISE_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const response = await fetch(`/api/geocoding?lat=${latitude}&lon=${longitude}`)
  const data = await response.json()
  return data.success ? data.location : null
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const [userLocation, setUserLocation] = useState("")
  const [loadingLocation, setLoadingLocation] = useState(true)
  const hasResolvedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const currentUserRef = useRef(currentUser)

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const applyCachedLocation = useCallback((cache: CachedLocation) => {
    setUserLocation(cache.location)
    setLoadingLocation(false)
  }, [])

  const saveUserLocation = useCallback(async (location: string, latitude: number, longitude: number) => {
    const user = currentUserRef.current
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.firebaseUser.uid)
      await updateDoc(userDocRef, {
        location,
        coordinates: { latitude, longitude },
        lastLocationUpdate: new Date(),
      })
    } catch (error) {
      console.error("Error saving user location:", error)
    }
  }, [])

  const resolveFromGps = useCallback(
    async (precise = false, showLoading = true) => {
      if (!navigator.geolocation) {
        setUserLocation("Geolocalización no soportada")
        setLoadingLocation(false)
        return
      }

      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (showLoading) setLoadingLocation(true)

      try {
        const position = await getCurrentPosition(precise ? PRECISE_GEO_OPTIONS : FAST_GEO_OPTIONS)
        const { latitude, longitude } = position.coords
        const location = await reverseGeocode(latitude, longitude)

        if (location) {
          writeLocationCache({ location, latitude, longitude, updatedAt: Date.now() })
          setUserLocation(location)
          await saveUserLocation(location, latitude, longitude)
        } else {
          setUserLocation("Ubicación no disponible")
        }
      } catch (error) {
        const geoError = error as GeolocationPositionError
        if (geoError?.code === 1) {
          markLocationDenied()
        }
        console.error("Error getting location:", error)
        setUserLocation("Ubicación no disponible")
      } finally {
        isFetchingRef.current = false
        setLoadingLocation(false)
      }
    },
    [saveUserLocation]
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

      if (!location) return false

      writeLocationCache({
        location,
        latitude: coordinates?.latitude ?? 0,
        longitude: coordinates?.longitude ?? 0,
        updatedAt: Date.now(),
      })
      setUserLocation(location)
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
      if (isCacheFresh(cached)) {
        hasResolvedRef.current = true
        return
      }
    }

    if (wasLocationDenied() && cached) {
      hasResolvedRef.current = true
      return
    }

    if (currentUserRef.current) {
      const loadedFromProfile = await loadFromFirestore()
      if (loadedFromProfile) {
        hasResolvedRef.current = true
        return
      }
    }

    if (wasLocationDenied()) {
      setUserLocation(cached?.location || "Ubicación no disponible")
      setLoadingLocation(false)
      hasResolvedRef.current = true
      return
    }

    await resolveFromGps(false, !cached)
    hasResolvedRef.current = true
  }, [applyCachedLocation, loadFromFirestore, resolveFromGps])

  const refreshLocation = useCallback(async () => {
    clearLocationDenied()
    await resolveFromGps(true, true)
  }, [resolveFromGps])

  useEffect(() => {
    const cached = migrateLegacyLocationCache() ?? readLocationCache()
    if (cached) {
      applyCachedLocation(cached)
      if (isCacheFresh(cached)) {
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

  return (
    <LocationContext.Provider value={{ userLocation, loadingLocation, refreshLocation }}>
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
