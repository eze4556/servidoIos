import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface BuyerPanelProps {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export function BuyerPanel({ title, description, children, action, className }: BuyerPanelProps) {
  return (
    <section className={cn("rounded-2xl border border-purple-100/80 bg-white shadow-sm shadow-purple-900/5", className)}>
      <div className="flex flex-col gap-3 border-b border-purple-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}
