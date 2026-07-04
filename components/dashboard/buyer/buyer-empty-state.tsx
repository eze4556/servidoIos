import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface BuyerEmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  icon?: ReactNode
}

export function BuyerEmptyState({ title, description, actionLabel, actionHref, icon }: BuyerEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 px-6 py-14 text-center">
      {icon && <div className="mb-4 text-purple-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-6 rounded-full bg-purple-900 hover:bg-purple-800">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}
