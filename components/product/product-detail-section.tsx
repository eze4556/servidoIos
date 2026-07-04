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
        "overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-purple-50 bg-gradient-to-r from-purple-50/80 to-violet-50/50 px-5 py-4 sm:px-6">
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
          {title}
          {typeof count === "number" && (
            <span className="ml-2 text-base font-semibold text-purple-600">({count})</span>
          )}
        </h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}
