"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { getSubscriptionSnapshot, type SubscriptionStatus } from "@/lib/subscription-utils"
import { getMercadoPagoConnectionSnapshot, type MercadoPagoConnectionStatus } from "@/lib/mercadopago-connection"
import { notifySubscriptionReminder } from "@/lib/notifications"

interface UserProfile {
  firebaseUser: FirebaseUser
  role?: "user" | "seller" | "admin" | "cadete"
  businessType?: "restaurant" | "store"
  restaurantId?: string
  status?: string
  isActive?: boolean
  zone?: string
  vehicle?: string
  phone?: string
  name?: string
  subscriptionStatus?: SubscriptionStatus
  subscriptionEndsAt?: Date | null
  subscriptionDaysRemaining?: number | null
  subscriptionCancelAtPeriodEnd?: boolean
  isSubscribed?: boolean
  mercadoPagoStatus?: MercadoPagoConnectionStatus
  mercadoPagoConnectionEndsAt?: Date | null
  mercadoPagoAccountId?: string | null
  productUploadLimit?: number
  photoURL?: string
  photoPath?: string
}

interface AuthContextType {
  currentUser: UserProfile | null
  authLoading: boolean
  handleLogout: () => Promise<void>
  getDashboardLink: () => string
  getVenderLink: () => string
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  const getEffectiveRole = useCallback((user: FirebaseUser, role?: "user" | "seller" | "admin" | "cadete") => {
    return role || "user"
  }, [])

  const buildUserProfile = useCallback(
    (user: FirebaseUser, userData: Record<string, unknown>): UserProfile => {
      const subscriptionSnapshot = getSubscriptionSnapshot(userData)
      const mercadoPagoSnapshot = getMercadoPagoConnectionSnapshot(userData)
      return {
        firebaseUser: user,
        role: getEffectiveRole(user, userData.role as UserProfile["role"]),
        businessType: userData.businessType as UserProfile["businessType"],
        restaurantId: (userData.restaurantId as string) || undefined,
        status: (userData.status as string) || undefined,
        isActive: typeof userData.isActive === "boolean" ? userData.isActive : undefined,
        zone: (userData.zone as string) || undefined,
        vehicle: (userData.vehicle as string) || undefined,
        phone: (userData.phone as string) || undefined,
        name: (userData.name as string) || user.displayName || undefined,
        subscriptionStatus: subscriptionSnapshot.status,
        subscriptionEndsAt: subscriptionSnapshot.endsAt,
        subscriptionDaysRemaining: subscriptionSnapshot.daysRemaining,
        subscriptionCancelAtPeriodEnd: subscriptionSnapshot.cancelAtPeriodEnd,
        isSubscribed: subscriptionSnapshot.status === "active",
        mercadoPagoStatus: mercadoPagoSnapshot.status,
        mercadoPagoConnectionEndsAt: mercadoPagoSnapshot.expiresAt,
        mercadoPagoAccountId: mercadoPagoSnapshot.accountId,
        productUploadLimit: (userData.productUploadLimit as number) || 0,
        photoURL: (userData.photoURL as string) || user.photoURL || undefined,
        photoPath: (userData.photoPath as string) || undefined,
      }
    },
    [getEffectiveRole]
  )

  // Function to refresh user profile data from Firestore
  const refreshUserProfile = useCallback(async () => {
    const user = auth.currentUser
    if (user) {
      const userDocRef = doc(db, "users", user.uid)
      const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        setCurrentUser(buildUserProfile(user, userDocSnap.data()))
      } else {
        setCurrentUser({
          firebaseUser: user,
          role: getEffectiveRole(user, "user"),
          subscriptionStatus: "inactive",
          subscriptionEndsAt: null,
          subscriptionDaysRemaining: null,
          subscriptionCancelAtPeriodEnd: false,
          isSubscribed: false,
          mercadoPagoStatus: "not_connected",
          mercadoPagoConnectionEndsAt: null,
          mercadoPagoAccountId: null,
          productUploadLimit: 0,
          photoURL: user.photoURL || undefined,
          photoPath: undefined,
        })
      }
    } else {
      setCurrentUser(null)
    }
  }, [buildUserProfile, getEffectiveRole])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          setCurrentUser(buildUserProfile(user, userDocSnap.data()))
        } else {
          setCurrentUser({
            firebaseUser: user,
            role: getEffectiveRole(user, "user"),
            subscriptionStatus: "inactive",
            subscriptionEndsAt: null,
            subscriptionDaysRemaining: null,
            subscriptionCancelAtPeriodEnd: false,
            isSubscribed: false,
            mercadoPagoStatus: "not_connected",
            mercadoPagoConnectionEndsAt: null,
            mercadoPagoAccountId: null,
            productUploadLimit: 0,
            photoURL: user.photoURL || undefined,
            photoPath: undefined,
          })
        }
      } else {
        setCurrentUser(null)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [buildUserProfile, getEffectiveRole])

  useEffect(() => {
    if (!currentUser?.firebaseUser.uid) return

    const refreshTimer = window.setInterval(() => {
      void refreshUserProfile()
    }, 60_000)

    return () => window.clearInterval(refreshTimer)
  }, [currentUser?.firebaseUser.uid, refreshUserProfile])

  useEffect(() => {
    if (!currentUser?.firebaseUser.uid || currentUser.subscriptionStatus !== "active" || !currentUser.subscriptionEndsAt) {
      return
    }

    const remainingMilliseconds = currentUser.subscriptionEndsAt.getTime() - Date.now()
    if (remainingMilliseconds <= 0) {
      void refreshUserProfile()
      return
    }

    const expiryTimer = window.setTimeout(() => {
      void refreshUserProfile()
    }, remainingMilliseconds + 1000)

    return () => window.clearTimeout(expiryTimer)
  }, [currentUser?.firebaseUser.uid, currentUser?.subscriptionStatus, currentUser?.subscriptionEndsAt, refreshUserProfile])

  // Recordatorio in-app si la suscripción vence en ≤7 días (máx. 1 aviso por día)
  useEffect(() => {
    const uid = currentUser?.firebaseUser.uid
    const days = currentUser?.subscriptionDaysRemaining
    if (!uid || days == null || days > 7) return
    if (currentUser.role !== "seller" && currentUser.businessType !== "restaurant") return
    void notifySubscriptionReminder({
      userId: uid,
      daysRemaining: days,
      link: currentUser.businessType === "restaurant" ? "/dashboard/restaurant" : "/dashboard/seller",
    })
  }, [
    currentUser?.firebaseUser.uid,
    currentUser?.subscriptionDaysRemaining,
    currentUser?.role,
    currentUser?.businessType,
  ])

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }, [router])

  const getDashboardLink = useCallback(() => {
    if (!currentUser) return "/login"
    switch (currentUser.role) {
      case "admin":
        return "/admin"
      case "cadete":
        return "/dashboard/cadete"
      case "seller":
        if (currentUser.businessType === "restaurant") {
          return "/dashboard/restaurant"
        }
        return "/dashboard/seller"
      default:
        return "/dashboard/buyer"
    }
  }, [currentUser])

  const getVenderLink = useCallback(() => {
    if (!currentUser) return "/signup?role=seller"
    if (currentUser.role === "seller") {
      if (currentUser.businessType === "restaurant") return "/dashboard/restaurant"
      return "/dashboard/seller"
    }
    return "/signup?role=seller&prompt=true"
  }, [currentUser])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authLoading,
        handleLogout,
        getDashboardLink,
        getVenderLink,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
