"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type LocaleFlagToggleProps = {
  className?: string
  variant?: "light" | "dark"
}

const LOCALE_OPTIONS: { value: AppLocale; flag: string; labelKey: "languageEs" | "languagePtBr" }[] = [
  { value: "es", flag: "🇦🇷", labelKey: "languageEs" },
  { value: "pt-BR", flag: "🇧🇷", labelKey: "languagePtBr" },
]

function setLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`
}

export function LocaleFlagToggle({ className, variant = "light" }: LocaleFlagToggleProps) {
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const t = useTranslations("header")

  const current = LOCALE_OPTIONS.find((o) => o.value === locale) ?? LOCALE_OPTIONS[0]

  const switchTo = (next: string) => {
    const loc = next as AppLocale
    if (loc === locale) return
    setLocaleCookie(loc)
    router.refresh()
  }

  const triggerClass =
    variant === "dark"
      ? "rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
      : "rounded-full bg-gray-100 text-gray-900 ring-1 ring-gray-200 hover:bg-gray-200"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-0.5 px-2 text-lg transition outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1",
            triggerClass,
            className
          )}
          aria-label={t("languageAria")}
        >
          <span aria-hidden>{current.flag}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("languageMenu")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={switchTo}>
          {LOCALE_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value} className="cursor-pointer">
              <span className="mr-2 text-base" aria-hidden>
                {opt.flag}
              </span>
              {t(opt.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
