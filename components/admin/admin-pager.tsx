"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export function AdminPager({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  from: number
  to: number
  onPageChange: (page: number) => void
}) {
  const t = useTranslations("adminDashboard.pagination")
  if (total <= 0) return null

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">{t("showing", { from, to, total })}</p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("previous")}
          </Button>
          <span className="min-w-[110px] text-center text-xs tabular-nums text-slate-600">
            {t("pageOf", { page, total: totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
