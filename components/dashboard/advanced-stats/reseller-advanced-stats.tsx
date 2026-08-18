"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePriceFormat } from "@/hooks/use-price-format"
import type { ResellerBatchRow, ResellerLinkRow, ResellerSaleRow } from "@/lib/reseller/reseller-dashboard-data"
import {
  bucketByMonth,
  countByName,
  lastNMonths,
  roundMoney,
  sumByName,
} from "@/lib/dashboard-stats"
import { StatsAreaChart, StatsBarChart, StatsChartCard, StatsKpi, StatsPieChart } from "@/components/dashboard/advanced-stats/stats-charts"

export function ResellerAdvancedStats({
  sales,
  links,
  batches,
  lifetimeUnits,
  totalClicks,
}: {
  sales: ResellerSaleRow[]
  links: ResellerLinkRow[]
  batches: ResellerBatchRow[]
  lifetimeUnits: number
  totalClicks: number
}) {
  const t = useTranslations("advancedStats")
  const { formatPriceNumber } = usePriceFormat()
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const commission = sales.reduce((sum, s) => sum + (Number(s.commissionTotal) || 0), 0)
  const pending = batches.filter((b) => b.status === "pending_payout").reduce((sum, b) => sum + b.amount, 0)

  const months = lastNMonths(6, dateLocale)
  const monthly = bucketByMonth(
    sales.map((s) => ({ date: s.createdAt, amount: Number(s.commissionTotal) || 0 })),
    months
  )
  const topProducts = sumByName(
    sales.map((s) => ({ name: s.productName, amount: Number(s.quantity) || 0 }))
  ).slice(0, 6)
  const linkMix = countByName(links.map((l) => (l.active ? t("reseller.active") : t("reseller.inactive"))))
  const batchMix = countByName(
    batches.map((b) => (b.status === "paid" ? t("reseller.paid") : t("reseller.pending")))
  )

  const hasData = useMemo(() => sales.length + links.length + batches.length > 0, [sales, links, batches])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("reseller.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsKpi label={t("reseller.kpiUnits")} value={lifetimeUnits} />
        <StatsKpi label={t("reseller.kpiClicks")} value={totalClicks} />
        <StatsKpi label={t("reseller.kpiCommission")} value={formatPriceNumber(roundMoney(commission))} />
        <StatsKpi label={t("reseller.kpiPending")} value={formatPriceNumber(roundMoney(pending))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title={t("reseller.commissionTitle")} description={t("lastMonths")} empty={!hasData || sales.length === 0} emptyLabel={t("empty")}>
          <StatsAreaChart data={monthly} />
        </StatsChartCard>
        <StatsChartCard title={t("reseller.productsTitle")} empty={topProducts.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={topProducts} layout="horizontal" />
        </StatsChartCard>
        <StatsChartCard title={t("reseller.linksTitle")} empty={linkMix.length === 0} emptyLabel={t("empty")}>
          <StatsPieChart data={linkMix} />
        </StatsChartCard>
        <StatsChartCard title={t("reseller.batchesTitle")} empty={batchMix.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={batchMix} />
        </StatsChartCard>
      </div>
    </div>
  )
}
