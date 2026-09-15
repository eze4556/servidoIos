"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  hasSeenTutorial,
  markTutorialSeen,
  resolveTutorialAudience,
  type TutorialAudience,
} from "@/lib/tutorial/storage"

interface TutorialContextValue {
  open: boolean
  audience: TutorialAudience
  openTutorial: (audience?: TutorialAudience) => void
  closeTutorial: (opts?: { markSeen?: boolean }) => void
}

const TutorialContext = createContext<TutorialContextValue | null>(null)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { currentUser, authLoading } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [audience, setAudience] = useState<TutorialAudience>("home")
  const [autoTried, setAutoTried] = useState(false)

  const defaultAudience = useMemo(() => {
    if (pathname?.startsWith("/dashboard/cadete")) return "cadete" as const
    if (pathname?.startsWith("/dashboard/restaurant")) return "restaurant" as const
    if (pathname?.startsWith("/dashboard/seller")) return "seller" as const
    if (pathname?.startsWith("/dashboard/buyer")) return "buyer" as const
    return resolveTutorialAudience(currentUser)
  }, [pathname, currentUser])

  const openTutorial = useCallback((next?: TutorialAudience) => {
    setAudience(next || defaultAudience)
    setOpen(true)
  }, [defaultAudience])

  const closeTutorial = useCallback((opts?: { markSeen?: boolean }) => {
    if (opts?.markSeen !== false) {
      markTutorialSeen(audience)
    }
    setOpen(false)
  }, [audience])

  // Primera visita por audiencia: se muestra una sola vez.
  useEffect(() => {
    if (authLoading || autoTried) return
    if (pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname?.startsWith("/admin")) {
      setAutoTried(true)
      return
    }
    const target = defaultAudience
    if (!hasSeenTutorial(target)) {
      setAudience(target)
      setOpen(true)
    }
    setAutoTried(true)
  }, [authLoading, autoTried, defaultAudience, pathname])

  const value = useMemo(
    () => ({ open, audience, openTutorial, closeTutorial }),
    [open, audience, openTutorial, closeTutorial]
  )

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
}

export function useTutorial() {
  const ctx = useContext(TutorialContext)
  if (!ctx) {
    throw new Error("useTutorial must be used within TutorialProvider")
  }
  return ctx
}
