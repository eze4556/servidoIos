"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePriceFormat } from "@/hooks/use-price-format"
import {
  bucketByMonth,
  countByName,
  lastNMonths,
  roundMoney,
  sumByName,
  toJsDate,
} from "@/lib/dashboard-stats"
import { StatsAreaChart, StatsBarChart, StatsChartCard, StatsKpi, StatsPieChart } from "@/components/dashboard/advanced-stats/stats-charts"

type BuyerPurchase = {
  fechaCompra?: string
  estadoPago?: string
  isService?: boolean
  productPrice?: number
  quantity?: number
  vendedorNombre?: string
}

export function BuyerAdvancedStats({
  purchases,
  favoritesCount,
}: {
  purchases: BuyerPurchase[]
  favoritesCount: number
}) {
  const t = useTranslations("advancedStats")
  const { formatPriceNumber } = usePriceFormat()
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const rows = useMemo(
    () =>
      purchases.map((p) => ({
        ...p,
        amount: (Number(p.productPrice) || 0) * (Number(p.quantity) || 1),
      })),
    [purchases]
  )
  const spent = rows.reduce((sum, p) => sum + p.amount, 0)
  const ticket = rows.length ? spent / rows.length : 0

  const months = lastNMonths(6, dateLocale)
  const monthly = bucketByMonth(
    rows.map((p) => ({ date: toJsDate(p.fechaCompra), amount: p.amount })),
    months
  )
  const mix = countByName(rows.map((p) => (p.isService ? t("buyer.services") : t("buyer.products"))))
  const byStatus = countByName(rows.map((p) => p.estadoPago || t("unknown")))
  const topSellers = sumByName(
    rows.map((p) => ({ name: p.vendedorNombre || t("unknown"), amount: p.amount }))
  ).slice(0, 6)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("buyer.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsKpi label={t("buyer.kpiPurchases")} value={rows.length} />
        <StatsKpi label={t("buyer.kpiSpent")} value={formatPriceNumber(roundMoney(spent))} />
        <StatsKpi label={t("buyer.kpiTicket")} value={formatPriceNumber(roundMoney(ticket))} />
        <StatsKpi label={t("buyer.kpiFavorites")} value={favoritesCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title={t("buyer.spendTitle")} description={t("lastMonths")} empty={rows.length === 0} emptyLabel={t("empty")}>
          <StatsAreaChart data={monthly} />
        </StatsChartCard>
        <StatsChartCard title={t("buyer.mixTitle")} empty={mix.length === 0} emptyLabel={t("empty")}>
          <StatsPieChart data={mix} />
        </StatsChartCard>
        <StatsChartCard title={t("buyer.statusTitle")} empty={byStatus.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={byStatus} />
        </StatsChartCard>
        <StatsChartCard title={t("buyer.sellersTitle")} empty={topSellers.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={topSellers} layout="horizontal" />
        </StatsChartCard>
      </div>
    </div>
  )
}
