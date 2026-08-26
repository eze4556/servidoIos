"use client"

import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

function getUserFirstName(displayName?: string | null, email?: string | null) {
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/)[0]
  }
  if (email?.trim()) {
    return email.split("@")[0]
  }
  return null
}

interface UserGreetingProps {
  variant?: "desktop" | "mobile"
  className?: string
}

export function UserGreeting({ variant = "desktop", className }: UserGreetingProps) {
  const { currentUser, authLoading } = useAuth()
  const t = useTranslations("greeting")
  const tc = useTranslations("common")

  if (authLoading || !currentUser) {
    return null
  }

  const firstName =
    getUserFirstName(currentUser.firebaseUser.displayName, currentUser.firebaseUser.email) ||
    tc("user")

  const text = t("hello", { name: firstName })

  if (variant === "mobile") {
    return (
      <p className={cn("truncate text-xs font-medium text-purple-100/95", className)}>
        {text}{" "}
        <span className="inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_infinite]" aria-hidden>
          👋
        </span>
      </p>
    )
  }

  return (
    <p
      className={cn(
        "hidden shrink-0 whitespace-nowrap text-sm font-medium text-servido-900/80 xl:inline",
        className
      )}
    >
      {text}
    </p>
  )
}
