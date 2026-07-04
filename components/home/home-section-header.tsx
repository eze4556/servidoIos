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

const accentStyles = {
  purple: "from-purple-500 to-purple-900",
  amber: "from-amber-400 to-orange-600",
  emerald: "from-emerald-400 to-teal-600",
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
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className={`h-9 w-1.5 rounded-full bg-gradient-to-b ${accentStyles[accent]}`} />
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">{title}</h2>
          </div>
        </div>
        {subtitle && <p className="pl-5 text-sm text-gray-500 md:pl-6 md:text-base">{subtitle}</p>}
      </div>
      {href && linkText && (
        <Link
          href={href}
          className="group inline-flex w-fit items-center gap-2 rounded-full bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-200 transition-all duration-300 hover:bg-purple-800 hover:shadow-lg"
        >
          {linkText}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
