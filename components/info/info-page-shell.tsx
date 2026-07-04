import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import Link from "next/link"
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
  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30", className)}>
      <div className="container mx-auto px-4 pb-16 pt-6 md:px-6 md:pb-20 md:pt-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-2 text-sm font-medium text-purple-900 shadow-sm transition-colors hover:bg-purple-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <section className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d0057] via-purple-900 to-violet-900 px-6 py-10 shadow-xl shadow-purple-900/20 sm:px-8 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-violet-300/15 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-100 backdrop-blur-sm">
              <BadgeIcon className="h-3.5 w-3.5" />
              {badge}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">{title}</h1>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-purple-100 sm:text-base">{subtitle}</p>
            )}
            {lastUpdated && (
              <p className="mt-4 text-xs font-medium text-purple-200/90">Última actualización: {lastUpdated}</p>
            )}
          </div>
        </section>

        {children}
      </div>
    </div>
  )
}
