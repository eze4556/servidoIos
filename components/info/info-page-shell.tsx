"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { ArrowLeft, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoPageShellProps {
  badge: string
  badgeIcon?: LucideIcon
  title: string
  subtitle?: string
  lastUpdated?: string
  children: ReactNode
  className?: string
}

export function InfoPageShell({
  badge,
  badgeIcon: BadgeIcon = Sparkles,
  title,
  subtitle,
  lastUpdated,
  children,
  className,
}: InfoPageShellProps) {
  const t = useTranslations("infoCommon")

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30", className)}>
      <div className="container mx-auto px-4 pb-16 pt-6 md:px-6 md:pb-20 md:pt-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-servido-200 bg-white px-4 py-2 text-sm font-medium text-servido-900 shadow-sm transition-colors hover:bg-servido-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backHome")}
        </Link>

        <section className="relative mb-10 overflow-hidden rounded-2xl bg-servido-950 px-6 py-10 shadow-[0_24px_60px_-28px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 sm:px-8 sm:py-12 lg:rounded-[1.75rem]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />

          <div className="relative">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 ring-1 ring-white/15">
              <BadgeIcon className="h-3.5 w-3.5 text-servido-gold" />
              {badge}
            </span>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
                {subtitle}
              </p>
            )}
            {lastUpdated && (
              <p className="mt-4 text-sm text-white/55">{t("lastUpdated", { date: lastUpdated })}</p>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-4xl">{children}</div>
      </div>
    </div>
  )
}
