import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InfoCtaCardProps {
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel?: string
  secondaryHref?: string
  icon?: LucideIcon
  className?: string
}

export function InfoCtaCard({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  icon: Icon,
  className,
}: InfoCtaCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-servido-950 p-6 shadow-[0_24px_60px_-30px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 sm:p-8 lg:rounded-3xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          {Icon && (
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-servido-gold ring-1 ring-white/15">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button
            asChild
            className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
          >
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryLabel && secondaryHref && (
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
