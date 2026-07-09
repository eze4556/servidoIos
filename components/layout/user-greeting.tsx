"use client"

import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

function getUserFirstName(displayName?: string | null, email?: string | null) {
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/)[0]
  }
  if (email?.trim()) {
    return email.split("@")[0]
  }
  return "Usuario"
}

interface UserGreetingProps {
  variant?: "desktop" | "mobile"
  className?: string
}

export function UserGreeting({ variant = "desktop", className }: UserGreetingProps) {
  const { currentUser, authLoading } = useAuth()

  if (authLoading || !currentUser) {
    return null
  }

  const firstName = getUserFirstName(
    currentUser.firebaseUser.displayName,
    currentUser.firebaseUser.email
  )

  if (variant === "mobile") {
    return (
      <p className={cn("truncate text-xs font-medium text-purple-100/95", className)}>
        Hola, {firstName}{" "}
        <span className="inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_infinite]" aria-hidden>
          👋
        </span>
      </p>
    )
  }

  return (
    <p
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full bg-purple-50 px-3 py-1.5 text-sm font-semibold text-servido-900 ring-1 ring-purple-100",
        className
      )}
    >
      Hola, {firstName}{" "}
        <span className="inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_infinite]" aria-hidden>
          👋
        </span>
    </p>
  )
}
