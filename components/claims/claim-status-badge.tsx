"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { ClaimStatus } from "@/types/claims"

const STATUS_CLASS: Record<string, string> = {
  waiting_seller: "bg-amber-100 text-amber-800",
  seller_responded: "bg-sky-100 text-sky-800",
  waiting_buyer: "bg-violet-100 text-violet-800",
  open: "bg-amber-100 text-amber-800",
  agreement_proposed: "bg-teal-100 text-teal-800",
  agreement_accepted: "bg-emerald-100 text-emerald-800",
  in_review: "bg-indigo-100 text-indigo-800",
  partial_refund_requested: "bg-orange-100 text-orange-800",
  total_refund_requested: "bg-orange-100 text-orange-800",
  closed: "bg-slate-100 text-slate-700",
  rejected: "bg-rose-100 text-rose-800",
  refund_processing: "bg-orange-100 text-orange-800",
  refund_approved: "bg-emerald-100 text-emerald-800",
  refund_rejected: "bg-rose-100 text-rose-800",
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const t = useTranslations("claims")
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        STATUS_CLASS[status] || "bg-slate-100 text-slate-700"
      )}
    >
      {t(`status.${status}`)}
    </span>
  )
}
