"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePriceFormat } from "@/hooks/use-price-format"
import type { FoodOrder } from "@/types/restaurant"
import {
  getFoodOrderStatusLabel,
  getRestaurantPaymentMethodLabel,
} from "@/lib/i18n/restaurant-labels"
import {
  bucketByMonth,
  countByName,
  lastNMonths,
  roundMoney,
  sumByName,
  toJsDate,
} from "@/lib/dashboard-stats"
import { StatsAreaChart, StatsBarChart, StatsChartCard, StatsKpi, StatsPieChart } from "@/components/dashboard/advanced-stats/stats-charts"

export function RestaurantAdvancedStats({ orders }: { orders: FoodOrder[] }) {
  const t = useTranslations("advancedStats")
  const tFood = useTranslations("foodOrders")
  const tRest = useTranslations("restaurants")
  const { formatPriceNumber } = usePriceFormat()
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const approved = useMemo(
    () => orders.filter((o) => o.paymentStatus === "approved"),
    [orders]
  )

  const revenue = approved.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0)
  const commission = approved.reduce((sum, o) => sum + (Number(o.servidoCommission) || 0), 0)
  const ticket = approved.length ? revenue / approved.length : 0

  const months = lastNMonths(6, dateLocale)
  const monthly = bucketByMonth(
    approved.map((o) => ({ date: toJsDate(o.createdAt), amount: Number(o.subtotal) || 0 })),
    months
  )

  const byStatus = countByName(orders.map((o) => getFoodOrderStatusLabel((k) => tFood(k), o.status)))
  const byPayment = countByName(
    approved.map((o) =>
      o.paymentMethod ? getRestaurantPaymentMethodLabel((k) => tRest(k), o.paymentMethod) : t("unknown")
    )
  )
  const topDishes = sumByName(
    approved.flatMap((o) =>
      (o.items || []).map((item) => ({
        name: item.name,
        amount: (Number(item.price) || 0) * (Number(item.quantity) || 1),
      }))
    )
  ).slice(0, 6)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("restaurant.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsKpi label={t("restaurant.kpiOrders")} value={approved.length} />
        <StatsKpi label={t("restaurant.kpiRevenue")} value={formatPriceNumber(roundMoney(revenue))} />
        <StatsKpi label={t("restaurant.kpiTicket")} value={formatPriceNumber(roundMoney(ticket))} />
        <StatsKpi label={t("restaurant.kpiCommission")} value={formatPriceNumber(roundMoney(commission))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartCard title={t("restaurant.revenueTitle")} description={t("lastMonths")} empty={approved.length === 0} emptyLabel={t("empty")}>
          <StatsAreaChart data={monthly} />
        </StatsChartCard>
        <StatsChartCard title={t("restaurant.statusTitle")} empty={byStatus.length === 0} emptyLabel={t("empty")}>
          <StatsPieChart data={byStatus} />
        </StatsChartCard>
        <StatsChartCard title={t("restaurant.paymentTitle")} empty={byPayment.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={byPayment} />
        </StatsChartCard>
        <StatsChartCard title={t("restaurant.dishesTitle")} empty={topDishes.length === 0} emptyLabel={t("empty")}>
          <StatsBarChart data={topDishes} layout="horizontal" />
        </StatsChartCard>
      </div>
    </div>
  )
}
