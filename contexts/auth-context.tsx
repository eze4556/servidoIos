"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { getSubscriptionSnapshot, type SubscriptionStatus } from "@/lib/subscription-utils"
import { getMercadoPagoConnectionSnapshot, type MercadoPagoConnectionStatus } from "@/lib/mercadopago-connection"

interface UserProfile {
  firebaseUser: FirebaseUser
  role?: "user" | "seller" | "admin"
  subscriptionStatus?: SubscriptionStatus
  subscriptionEndsAt?: Date | null
  subscriptionDaysRemaining?: number | null
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

  const getEffectiveRole = useCallback((user: FirebaseUser, role?: "user" | "seller" | "admin") => {
    return role || "user"
  }, [])

  // Function to refresh user profile data from Firestore
  const refreshUserProfile = useCallback(async () => {
    const user = auth.currentUser
    if (user) {
      const userDocRef = doc(db, "users", user.uid)
      const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const subscriptionSnapshot = getSubscriptionSnapshot(userData)
        const mercadoPagoSnapshot = getMercadoPagoConnectionSnapshot(userData)
        setCurrentUser({
          firebaseUser: user,
          role: getEffectiveRole(user, userData.role),
          subscriptionStatus: subscriptionSnapshot.status,
          subscriptionEndsAt: subscriptionSnapshot.endsAt,
          subscriptionDaysRemaining: subscriptionSnapshot.daysRemaining,
          isSubscribed: subscriptionSnapshot.status === "active",
          mercadoPagoStatus: mercadoPagoSnapshot.status,
          mercadoPagoConnectionEndsAt: mercadoPagoSnapshot.expiresAt,
          mercadoPagoAccountId: mercadoPagoSnapshot.accountId,
          productUploadLimit: userData.productUploadLimit || 0,
          photoURL: userData.photoURL || user.photoURL || undefined,
          photoPath: userData.photoPath || undefined,
        })
      } else {
        setCurrentUser({
          firebaseUser: user,
          role: getEffectiveRole(user, "user"),
          subscriptionStatus: "inactive",
          subscriptionEndsAt: null,
          subscriptionDaysRemaining: null,
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
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        const subscriptionSnapshot = getSubscriptionSnapshot(userData)
        const mercadoPagoSnapshot = getMercadoPagoConnectionSnapshot(userData)
        setCurrentUser({
          firebaseUser: user,
          role: getEffectiveRole(user, userData.role),
          subscriptionStatus: subscriptionSnapshot.status,
          subscriptionEndsAt: subscriptionSnapshot.endsAt,
          subscriptionDaysRemaining: subscriptionSnapshot.daysRemaining,
          isSubscribed: subscriptionSnapshot.status === "active",
          mercadoPagoStatus: mercadoPagoSnapshot.status,
          mercadoPagoConnectionEndsAt: mercadoPagoSnapshot.expiresAt,
          mercadoPagoAccountId: mercadoPagoSnapshot.accountId,
          productUploadLimit: userData.productUploadLimit || 0,
          photoURL: userData.photoURL || user.photoURL || undefined,
          photoPath: userData.photoPath || undefined,
        })
      } else {
          setCurrentUser({
            firebaseUser: user,
            role: getEffectiveRole(user, "user"),
          subscriptionStatus: "inactive",
          subscriptionEndsAt: null,
          subscriptionDaysRemaining: null,
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
  }, [])

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
      case "seller":
        return "/dashboard/seller"
      default:
        return "/dashboard/buyer"
    }
  }, [currentUser])

  const getVenderLink = useCallback(() => {
    if (!currentUser) return "/signup?role=seller"
    if (currentUser.role === "seller") return "/dashboard/seller"
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
