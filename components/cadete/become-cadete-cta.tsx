"use client"

import Link from "next/link"
import { ArrowRight, Bike, Clock3, MapPin, Wallet } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

export function useBecomeCadeteHref(): string {
  const { currentUser } = useAuth()
  if (!currentUser) return "/signup/cadete"
  if (currentUser.role === "cadete") return "/dashboard/cadete"
  if (currentUser.role === "admin" || currentUser.role === "seller") return "/signup/cadete"
  return "/dashboard/buyer?tab=becomeCadete"
}

type BecomeCadeteCtaProps = {
  variant?: "banner" | "compact" | "chip"
  className?: string
}

export function BecomeCadeteCta({ variant = "banner", className }: BecomeCadeteCtaProps) {
  const t = useTranslations("becomeCadeteCta")
  const href = useBecomeCadeteHref()
  const { currentUser } = useAuth()
  const isCadete = currentUser?.role === "cadete"
  const ctaLabel = isCadete ? t("ctaPanel") : t("cta")

  if (variant === "chip") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-600",
          className
        )}
      >
        <Bike className="h-3.5 w-3.5" />
        {t("chip")}
      </Link>
    )
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-servido-900 p-3 text-white shadow-md shadow-sky-900/20 ring-1 ring-white/10 transition hover:brightness-110",
          className
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
          <Bike className="h-5 w-5 text-servido-gold" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">{t("title")}</span>
          <span className="mt-0.5 block text-xs text-white/70">{t("compactSubtitle")}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-servido-gold transition group-hover:translate-x-0.5" />
      </Link>
    )
  }

  return (
    <section className={cn("relative overflow-hidden rounded-3xl", className)}>
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-900 to-servido-950 p-5 text-white shadow-[0_22px_48px_-28px_rgba(3,105,161,0.75)] ring-1 ring-sky-400/20 transition hover:ring-servido-gold/40 sm:p-6"
      >
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-servido-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-servido-gold/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-servido-gold ring-1 ring-servido-gold/25">
              <Bike className="h-3.5 w-3.5" />
              {t("badge")}
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/75 sm:text-[15px]">{t("subtitle")}</p>

            <ul className="mt-4 flex flex-wrap gap-2">
              <Perk icon={Wallet} label={t("perkPay")} />
              <Perk icon={Clock3} label={t("perkFlex")} />
              <Perk icon={MapPin} label={t("perkZone")} />
            </ul>
          </div>

          <span className="inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-servido-gold px-5 text-sm font-bold text-servido-950 shadow-lg shadow-black/20 transition group-hover:gap-3 group-hover:bg-[#ffe566] sm:self-center">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </section>
  )
}

function Perk({ icon: Icon, label }: { icon: typeof Bike; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85 ring-1 ring-white/10">
      <Icon className="h-3 w-3 text-servido-gold" />
      {label}
    </li>
  )
}
