import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

interface HomeSectionHeaderProps {
  title: string
  subtitle?: string
  href?: string
  linkText?: string
  icon?: LucideIcon
  accent?: "purple" | "amber" | "emerald"
}

const accentBar = {
  purple: "from-servido-700 via-[#9204F8] to-servido-gold",
  amber: "from-amber-400 to-orange-500",
  emerald: "from-emerald-400 to-teal-500",
}

const iconStyles = {
  purple: "bg-servido-50 text-servido-800",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
}

export function HomeSectionHeader({
  title,
  subtitle,
  href,
  linkText,
  icon: Icon,
  accent = "purple",
}: HomeSectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          <span
            className={`hidden h-10 w-1 shrink-0 rounded-full bg-gradient-to-b sm:block ${accentBar[accent]}`}
            aria-hidden
          />
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${iconStyles[accent]}`}
              >
                <Icon className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-2xl font-semibold tracking-tight text-servido-950 md:text-[1.75rem]">
              {title}
            </h2>
          </div>
        </div>
        {subtitle && (
          <p className="max-w-2xl text-sm text-slate-500 sm:pl-[1.35rem] md:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {href && linkText && (
        <Link
          href={href}
          className="group inline-flex w-fit items-center gap-2 rounded-full bg-servido-950 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-servido-800"
        >
          {linkText}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
