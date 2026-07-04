import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface BuyerStatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  accent?: "purple" | "green" | "amber" | "rose"
}

const accentStyles = {
  purple: "bg-purple-100 text-purple-900",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
}

export function BuyerStatCard({ title, value, icon: Icon, accent = "purple" }: BuyerStatCardProps) {
  return (
    <div className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm shadow-purple-900/5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accentStyles[accent])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}
