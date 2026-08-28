"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { AlertTriangle, Clock, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { hoursLeftToRespond } from "@/lib/claims"
import { isClaimOpen, type ClaimDoc, type ClaimStatus } from "@/types/claims"
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge"
import { claimHref } from "@/lib/routes"

export function ClaimsList({
  claims,
  loading,
  emptyLabel,
  filter,
  onFilterChange,
  showDeadline,
}: {
  claims: ClaimDoc[]
  loading?: boolean
  emptyLabel: string
  filter?: string
  onFilterChange?: (value: string) => void
  showDeadline?: boolean
}) {
  const t = useTranslations("claims")

  return (
    <div className="space-y-4">
      {onFilterChange ? (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={filter || "all"} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[220px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="open">{t("filters.open")}</SelectItem>
              <SelectItem value="waiting_seller">{t("status.waiting_seller")}</SelectItem>
              <SelectItem value="seller_responded">{t("status.seller_responded")}</SelectItem>
              <SelectItem value="waiting_buyer">{t("status.waiting_buyer")}</SelectItem>
              <SelectItem value="agreement_proposed">{t("status.agreement_proposed")}</SelectItem>
              <SelectItem value="closed">{t("status.closed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
      ) : claims.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const hours = hoursLeftToRespond(claim)
            const expiring = showDeadline && isClaimOpen(claim.status) && hours != null && hours <= 12
            return (
              <article
                key={claim.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ClaimStatusBadge status={claim.status} />
                    {expiring ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        <Clock className="h-3 w-3" />
                        {t("deadlineSoon")}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="truncate font-semibold text-slate-900">{claim.productName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t(`reasons.${claim.reason}`)}</p>
                  {claim.lastMessagePreview ? (
                    <p className="mt-1 truncate text-sm text-slate-600">{claim.lastMessagePreview}</p>
                  ) : null}
                </div>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={claimHref(claim.id)}>{t("actions.view")}</Link>
                </Button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function filterClaims(claims: ClaimDoc[], filter: string) {
  if (!filter || filter === "all") return claims
  if (filter === "open") return claims.filter((claim) => isClaimOpen(claim.status))
  return claims.filter((claim) => claim.status === (filter as ClaimStatus))
}
