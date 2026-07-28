"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config"
import { cn } from "@/lib/utils"

type LocaleFlagToggleProps = {
  className?: string
  variant?: "light" | "dark"
}

function setLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`
}

export function LocaleFlagToggle({ className, variant = "light" }: LocaleFlagToggleProps) {
  const locale = useLocale()
  const router = useRouter()

  const switchTo = (next: AppLocale) => {
    if (next === locale) return
    setLocaleCookie(next)
    router.refresh()
  }

  const buttonClass =
    variant === "dark"
      ? "rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
      : "rounded-full bg-gray-100 ring-1 ring-gray-200 hover:bg-gray-200"

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => switchTo("es")}
        className={cn(
          "flex h-9 w-9 items-center justify-center text-lg transition",
          buttonClass,
          locale === "es" && "ring-2 ring-purple-600 ring-offset-1"
        )}
        aria-label="Español"
        title="Español"
      >
        🇦🇷
      </button>
      <button
        type="button"
        onClick={() => switchTo("pt-BR")}
        className={cn(
          "flex h-9 w-9 items-center justify-center text-lg transition",
          buttonClass,
          locale === "pt-BR" && "ring-2 ring-purple-600 ring-offset-1"
        )}
        aria-label="Português (Brasil)"
        title="Português (Brasil)"
      >
        🇧🇷
      </button>
    </div>
  )
}
