"use client"

import Link from "next/link"
import { ArrowLeft, Car } from "lucide-react"
import { useTranslations } from "next-intl"

interface VehiclesVerticalHeaderProps {
  showBackToMarketplace?: boolean
}

export function VehiclesVerticalHeader({ showBackToMarketplace = true }: VehiclesVerticalHeaderProps) {
  const t = useTranslations("vehicles")

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-servido-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showBackToMarketplace && (
            <Link
              href="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={t("backToHome")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <Link href="/autos" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-white/40">
              <Car className="h-5 w-5 text-servido-800" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-200/90">{t("zoneBadge")}</p>
              <p className="truncate text-base font-bold text-white md:text-lg">{t("heroTitle")}</p>
            </div>
          </Link>
        </div>
        <Link
          href="/dashboard/seller/vehicles"
          className="hidden shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-servido-800 shadow-md transition hover:bg-purple-50 sm:inline-flex"
        >
          {t("publishCtaShort")}
        </Link>
      </div>
    </header>
  )
}
