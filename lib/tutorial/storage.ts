"use client"

const STORAGE_PREFIX = "servido:tutorial-seen:v1"

export type TutorialAudience = "home" | "buyer" | "seller" | "restaurant" | "cadete"

export function hasSeenTutorial(audience: TutorialAudience): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}:${audience}`) === "1"
  } catch {
    return true
  }
}

export function markTutorialSeen(audience: TutorialAudience): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${audience}`, "1")
  } catch {
    // sin storage: se vuelve a mostrar
  }
}

export function resolveTutorialAudience(user: {
  role?: string | null
  businessType?: string | null
} | null): TutorialAudience {
  if (!user) return "home"
  if (user.role === "cadete") return "cadete"
  if (user.role === "seller" && user.businessType === "restaurant") return "restaurant"
  if (user.role === "seller") return "seller"
  return "buyer"
}
