"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePriceFormat } from "@/hooks/use-price-format"
import type { AdminSaleRecord } from "@/types/centralized-payments"
import {
  bucketByMonth,
  countByName,
  lastNMonths,
  roundMoney,
  toJsDate,
} from "@/lib/dashboard-stats"
import { StatsAreaChart, StatsBarChart, StatsChartCard, StatsKpi, StatsPieChart } from "@/components/dashboard/advanced-stats/stats-charts"

type CatalogProduct = {
  category?: string
  isService?: boolean
}

type ShippingLike = { shipping?: { status?: string } | null }

export function SellerAdvancedStats({
  sales,
  products,
  shipments,
}: {
  sales: AdminSaleRecord[]
  products: CatalogProduct[]
  shipments: ShippingLike[]
}) {
  const t = useTranslations("advancedStats")
  const { formatPriceNumber } = usePriceFormat()
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const paid = useMemo(
    () => sales.filter((s) => s.estadoPago === "pagado" || s.estadoPago === "pendiente"),
    [sales]
  )
  const net = paid.reduce((sum, s) => sum + (Number(s.montoAPagar) || 0), 0)
  const ticket = paid.length ? net / paid.length : 0

  const months = lastNMonths(6, dateLocale)
  const monthly = bucketByMonth(
    paid.map((s) => ({ date: toJsDate(s.fechaCompra), amount: Number(s.montoAPagar) || 0 })),
    months
  )

  const catalogMix = countByName(
    products.map((p) => (p.isService ? t("seller.services") : t("seller.products")))
  )
  const categories = countByName(products.map((p) => p.category || t("unknown"))).slice(0, 8)
  const shippingLabel = (status?: string) => {
    switch (status) {
      case "preparing":
        return t("seller.shipPreparing")
      case "shipped":
        return t("seller.shipShipped")
      case "delivered":
        return t("seller.shipDelivered")
      case "cancelled":
        return t("seller.shipCancelled")
      default:
        return t("seller.shipPending")
    }
  }
  const shipping = countByName(shipments.map((s) => shippingLabel(s.shipping?.status)))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("seller.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsKpi label={t("seller.kpiSales")} value={paid.length} />
        <StatsKpi label={t("seller.kpiNet")} value={formatPriceNumber(roundMoney(net))} />
        <StatsKpi label={t("seller.kpiTicket")} value={formatPriceNumber(roundMoney(ticket))} />
        <StatsKpi label={t("seller.kpiCatalog")} value={products.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title={t("seller.revenueTitle")} description={t("lastMonths")} empty={paid.length === 0} emptyLabel={t("empty")}>
          <StatsAreaChart data={monthly} />
        </StatsChartCard>
        <StatsChartCard title={t("seller.mixTitle")} empty={catalogMix.length === 0} emptyLabel={t("empty")}>
          <StatsPieChart data={catalogMix} />
        </StatsChartCard>
        <StatsChartCard title={t("seller.categoryTitle")} empty={categories.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={categories} />
        </StatsChartCard>
        <StatsChartCard title={t("seller.shippingTitle")} empty={shipping.length === 0} emptyLabel={t("empty")}>
          <StatsPieChart data={shipping} />
        </StatsChartCard>
      </div>
    </div>
  )
}
