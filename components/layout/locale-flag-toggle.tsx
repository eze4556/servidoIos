"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, ChevronDown, Heart, Rocket } from "lucide-react"
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type LocaleFlagToggleProps = {
  className?: string
  variant?: "light" | "dark"
}

type ActiveMarket = {
  locale: AppLocale
  flag: string
  countryKey: "countryArgentina" | "countryBrazil"
  showNewBadge?: boolean
}

type SoonMarket = {
  flag: string
  countryKey: "countryUruguay" | "countryChile" | "countryMexico"
}

const ACTIVE_MARKETS: ActiveMarket[] = [
  { locale: "es", flag: "🇦🇷", countryKey: "countryArgentina" },
  { locale: "pt-BR", flag: "🇧🇷", countryKey: "countryBrazil", showNewBadge: true },
]

const COMING_SOON_MARKETS: SoonMarket[] = [
  { flag: "🇺🇾", countryKey: "countryUruguay" },
  { flag: "🇨🇱", countryKey: "countryChile" },
  { flag: "🇲🇽", countryKey: "countryMexico" },
]

function setLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`
}

export function LocaleFlagToggle({ className, variant = "light" }: LocaleFlagToggleProps) {
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const t = useTranslations("header")
  const tp = useTranslations("header.localePicker")

  const current =
    ACTIVE_MARKETS.find((m) => m.locale === locale) ?? ACTIVE_MARKETS[0]

  const switchTo = (next: AppLocale) => {
    if (next === locale) return
    setLocaleCookie(next)
    router.refresh()
  }

  const triggerClass =
    variant === "dark"
      ? "rounded-full border border-white/25 bg-white/5 px-2.5 text-white hover:bg-white/10"
      : "rounded-full border border-purple-200/80 bg-white px-2.5 text-purple-900 shadow-sm hover:bg-purple-50"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 max-w-[9.5rem] items-center gap-1.5 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 sm:max-w-none",
            triggerClass,
            className
          )}
          aria-label={t("languageAria")}
        >
          <span className="text-lg leading-none" aria-hidden>
            {current.flag}
          </span>
          <span className="truncate">{tp(current.countryKey)}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-2rem,20rem)] overflow-hidden rounded-2xl border border-purple-100/80 p-0 shadow-xl"
      >
        <div className="px-4 pb-2 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-400">
            {tp("countriesActive")}
          </p>
          <ul className="mt-2 space-y-0.5">
            {ACTIVE_MARKETS.map((market) => {
              const selected = market.locale === locale
              return (
                <li key={market.locale}>
                  <button
                    type="button"
                    onClick={() => switchTo(market.locale)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-purple-50",
                      selected && "bg-purple-50/80"
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {market.flag}
                    </span>
                    <span className="flex-1 text-base font-semibold text-purple-900">
                      {tp(market.countryKey)}
                    </span>
                    {market.showNewBadge && !selected && (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                        {tp("badgeNew")}
                      </span>
                    )}
                    {selected && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white">
                        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="border-t border-purple-100 px-4 pb-2 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-400">
            {tp("comingSoonSection")}
          </p>
          <ul className="mt-2 space-y-0.5">
            {COMING_SOON_MARKETS.map((market) => (
              <li key={market.countryKey}>
                <Link
                  href="/proximamente"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-purple-50/60"
                >
                  <span className="text-2xl leading-none opacity-90" aria-hidden>
                    {market.flag}
                  </span>
                  <span className="flex-1 text-base font-semibold text-purple-900/90">
                    {tp(market.countryKey)}
                  </span>
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-500">
                    {tp("badgeComingSoon")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-3 border-t border-purple-100 bg-purple-50/90 px-4 py-3.5">
          <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-purple-900">{tp("footerTitle")}</p>
            <p className="mt-0.5 text-xs leading-snug text-purple-600/90">{tp("footerSubtitle")}</p>
          </div>
          <Heart className="h-5 w-5 shrink-0 text-purple-500" aria-hidden />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
