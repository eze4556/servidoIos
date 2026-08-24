"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { filterClaims, ClaimsList } from "@/components/claims/claims-list"
import { listClaimsForUser } from "@/lib/claims"
import type { ClaimDoc } from "@/types/claims"

export function SellerClaimsPanel({ sellerId }: { sellerId: string }) {
  const t = useTranslations("claims")
  const [claims, setClaims] = useState<ClaimDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("open")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const rows = await listClaimsForUser("seller", sellerId)
        if (!cancelled) setClaims(rows)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sellerId])

  const filtered = useMemo(() => filterClaims(claims, filter), [claims, filter])

  return (
    <div className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm shadow-purple-900/5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">{t("seller.title")}</h2>
      <p className="mt-0.5 mb-5 text-sm text-gray-500">{t("seller.description")}</p>
      <ClaimsList
        claims={filtered}
        loading={loading}
        emptyLabel={t("seller.empty")}
        filter={filter}
        onFilterChange={setFilter}
        showDeadline
      />
    </div>
  )
}

export function BuyerClaimsPanel({ buyerId }: { buyerId: string }) {
  const t = useTranslations("claims")
  const [claims, setClaims] = useState<ClaimDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const rows = await listClaimsForUser("buyer", buyerId)
        if (!cancelled) setClaims(rows)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [buyerId])

  return (
    <ClaimsList claims={claims} loading={loading} emptyLabel={t("buyer.empty")} />
  )
}
