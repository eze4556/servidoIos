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
        "relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-violet-50 p-6 sm:p-8",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-200/40 blur-2xl" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          {Icon && (
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-900 text-white">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button asChild className="rounded-full bg-purple-900 hover:bg-purple-800">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryLabel && secondaryHref && (
            <Button asChild variant="outline" className="rounded-full border-purple-200 text-purple-900 hover:bg-purple-50">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
