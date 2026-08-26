import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductDetailSectionProps {
  title: string
  icon?: LucideIcon
  count?: number
  children: ReactNode
  className?: string
}

export function ProductDetailSection({
  title,
  icon: Icon,
  count,
  children,
  className,
}: ProductDetailSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 lg:rounded-3xl",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-servido-950/[0.04] px-5 py-4 sm:px-6">
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-servido-50 text-servido-800">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-servido-950 sm:text-xl">
          {title}
          {typeof count === "number" && (
            <span className="ml-2 text-base font-medium text-servido-800/70">({count})</span>
          )}
        </h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}
