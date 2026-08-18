"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { usePriceFormat } from "@/hooks/use-price-format"
import { getPurchaseStatusLabel } from "@/lib/i18n/shipping-status-label"
import { getFoodOrderStatusLabel } from "@/lib/i18n/restaurant-labels"
import { buildAdminPlatformCharts } from "@/lib/admin-platform-stats"
import {
  StatsAreaChart,
  StatsBarChart,
  StatsChartCard,
  StatsKpi,
  StatsPieChart,
} from "@/components/dashboard/advanced-stats/stats-charts"

type UserRow = {
  id: string
  role?: string
  isActive?: boolean
  createdAt?: Date | unknown
}

type ProductRow = {
  category?: string
  isService?: boolean
  createdAt?: unknown
}

type CategoryRow = {
  id: string
  name: string
}

type PurchaseRow = {
  status?: string
  totalAmount?: number
  createdAt?: unknown
}

type SalesSummary = {
  totalVentas: number
  totalComisiones: number
  totalPendientePago: number
  totalPagado: number
  ventasPorVendedor: { vendedorNombre: string; totalVentas: number }[]
}

const adminCardClass = "rounded-2xl border-slate-200/80 shadow-sm shadow-slate-900/5"

function readDocLabel(data: Record<string, unknown> | undefined, fallback: string) {
  if (!data) return fallback
  const raw = data.name ?? data.nombre ?? data.title
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    for (const key of ["es", "es-AR", "pt-BR", "pt", "en"]) {
      const value = obj[key]
      if (typeof value === "string" && value.trim()) return value.trim()
    }
    const first = Object.values(obj).find((value) => typeof value === "string" && value.trim())
    if (typeof first === "string") return first.trim()
  }
  return fallback
}

function looksLikeDocId(value: string) {
  return /^[A-Za-z0-9_-]{16,}$/.test(value)
}

export function AdminPlatformStats({
  users,
  products,
  purchases,
  categories = [],
  salesSummary,
  loadingSales,
}: {
  users: UserRow[]
  products: ProductRow[]
  purchases: PurchaseRow[]
  categories?: CategoryRow[]
  salesSummary: SalesSummary
  loadingSales?: boolean
}) {
  const t = useTranslations("adminDashboard")
  const tStats = useTranslations("adminDashboard.platformStats")
  const tCommon = useTranslations("adminDashboard.common")
  const tFood = useTranslations("foodOrders")
  const { formatPriceNumber } = usePriceFormat()
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const [foodOrders, setFoodOrders] = useState<
    { status?: string; paymentStatus?: string; subtotal?: number; deliveryFee?: number; createdAt?: unknown }[]
  >([])
  const [loadingFood, setLoadingFood] = useState(true)
  const [categoryNameById, setCategoryNameById] = useState<Record<string, string>>({})
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingFood(true)
      try {
        const snap = await getDocs(collection(db, "foodOrders"))
        if (cancelled) return
        setFoodOrders(snap.docs.map((docSnap) => docSnap.data() as (typeof foodOrders)[number]))
      } catch {
        if (!cancelled) setFoodOrders([])
      } finally {
        if (!cancelled) setLoadingFood(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingCategories(true)
      const map: Record<string, string> = {}

      for (const category of categories) {
        const label = category.name?.trim()
        if (category.id && label) {
          map[category.id] = label
          map[label] = label
        }
      }

      try {
        const snap = await getDocs(collection(db, "categories"))
        for (const categoryDoc of snap.docs) {
          const label = readDocLabel(categoryDoc.data() as Record<string, unknown>, "")
          if (!label) continue
          map[categoryDoc.id] = label
          map[label] = label
        }
      } catch {
        // Keep whatever we already resolved from the admin list.
      }

      const unresolved = [
        ...new Set(
          products
            .map((product) => (product.category || "").trim())
            .filter((value) => value && looksLikeDocId(value) && !map[value])
        ),
      ]

      await Promise.all(
        unresolved.map(async (id) => {
          try {
            const categoryDoc = await getDoc(doc(db, "categories", id))
            if (categoryDoc.exists()) {
              const label = readDocLabel(categoryDoc.data() as Record<string, unknown>, "")
              if (label) map[id] = label
              return
            }
            const brandDoc = await getDoc(doc(db, "brands", id))
            if (brandDoc.exists()) {
              const label = readDocLabel(brandDoc.data() as Record<string, unknown>, "")
              if (label) map[id] = label
            }
          } catch {
            // Ignore individual lookup failures and fall back to unknown label.
          }
        })
      )

      if (!cancelled) {
        setCategoryNameById(map)
        setLoadingCategories(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [categories, products])

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: tStats("roles.admin"),
      seller: tStats("roles.seller"),
      cadete: tStats("roles.cadete"),
      user: tStats("roles.buyer"),
    }
    return map[role] || role
  }

  const charts = useMemo(
    () =>
      buildAdminPlatformCharts({
        users,
        products,
        purchases,
        foodOrders,
        salesSummary,
        roleLabel,
        statusLabel: (status) => getPurchaseStatusLabel((k) => t(k), status),
        foodStatusLabel: (status) => getFoodOrderStatusLabel((k) => tFood(k), status as never),
        activeLabel: tCommon("active"),
        inactiveLabel: tCommon("inactive"),
        productLabel: tCommon("product"),
        serviceLabel: tCommon("service"),
        locale: dateLocale,
        categoryNameById,
        unknownCategoryLabel: tStats("unknownCategory"),
      }),
    [users, products, purchases, foodOrders, salesSummary, dateLocale, t, tStats, tCommon, tFood, categoryNameById]
  )

  if (loadingSales || loadingFood || loadingCategories) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200/80 bg-white/80">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-sm text-slate-500">{tStats("loading")}</span>
      </div>
    )
  }

  const { kpis } = charts

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">{tStats("eyebrow")}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{tStats("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{tStats("description")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsKpi label={tStats("kpi.gmv")} value={formatPriceNumber(kpis.gmv)} />
        <StatsKpi label={tStats("kpi.commissions")} value={formatPriceNumber(kpis.commissions)} />
        <StatsKpi label={tStats("kpi.users")} value={kpis.users} />
        <StatsKpi label={tStats("kpi.orders")} value={kpis.orders} />
        <StatsKpi label={tStats("kpi.products")} value={kpis.products} />
        <StatsKpi label={tStats("kpi.sellers")} value={kpis.sellers} />
        <StatsKpi label={tStats("kpi.cadetes")} value={kpis.cadetes} />
        <StatsKpi label={tStats("kpi.foodOrders")} value={kpis.foodOrders} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.monthlySales")}
          description={tStats("charts.monthlySalesDesc")}
          empty={charts.monthlySales.every((m) => m.value === 0)}
          emptyLabel={tStats("empty")}
        >
          <StatsAreaChart data={charts.monthlySales} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.monthlyOrders")}
          description={tStats("charts.monthlyOrdersDesc")}
          empty={charts.monthlyOrders.every((m) => m.value === 0)}
          emptyLabel={tStats("empty")}
        >
          <StatsAreaChart data={charts.monthlyOrders} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.monthlySignups")}
          description={tStats("charts.monthlySignupsDesc")}
          empty={charts.monthlySignups.every((m) => m.value === 0)}
          emptyLabel={tStats("empty")}
        >
          <StatsBarChart data={charts.monthlySignups.map((m) => ({ name: m.label, value: m.value }))} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.monthlyFood")}
          description={tStats("charts.monthlyFoodDesc")}
          empty={charts.monthlyFoodRevenue.every((m) => m.value === 0)}
          emptyLabel={tStats("empty")}
        >
          <StatsAreaChart data={charts.monthlyFoodRevenue} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.usersByRole")}
          description={tStats("charts.usersByRoleDesc")}
          empty={charts.usersByRole.length === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsPieChart data={charts.usersByRole} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.userActivity")}
          description={tStats("charts.userActivityDesc")}
          empty={kpis.users === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsPieChart data={charts.userActivity} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.catalogSplit")}
          description={tStats("charts.catalogSplitDesc")}
          empty={kpis.products === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsPieChart data={charts.catalogSplit} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.ordersByStatus")}
          description={tStats("charts.ordersByStatusDesc")}
          empty={charts.ordersByStatus.length === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsPieChart data={charts.ordersByStatus} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.foodByStatus")}
          description={tStats("charts.foodByStatusDesc")}
          empty={charts.foodByStatus.length === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsPieChart data={charts.foodByStatus} />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.sellerPayouts")}
          description={tStats("charts.sellerPayoutsDesc")}
          empty={charts.sellerPayouts.every((s) => s.value === 0)}
          emptyLabel={tStats("empty")}
        >
          <StatsPieChart
            data={[
              { name: tStats("charts.paidToSellers"), value: charts.sellerPayouts[0]?.value || 0 },
              { name: tStats("charts.pendingToSellers"), value: charts.sellerPayouts[1]?.value || 0 },
            ]}
          />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.topCategories")}
          description={tStats("charts.topCategoriesDesc")}
          empty={charts.topCategories.length === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsBarChart data={charts.topCategories} layout="horizontal" />
        </StatsChartCard>

        <StatsChartCard
          className={adminCardClass}
          title={tStats("charts.topSellers")}
          description={tStats("charts.topSellersDesc")}
          empty={charts.topSellers.length === 0}
          emptyLabel={tStats("empty")}
        >
          <StatsBarChart data={charts.topSellers} layout="horizontal" />
        </StatsChartCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-teal-50/50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">{tStats("foodBlock.title")}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{formatPriceNumber(kpis.foodGmv)}</p>
          <p className="mt-1 text-sm text-slate-600">{tStats("foodBlock.gmv")}</p>
          <p className="mt-3 text-lg font-semibold tabular-nums text-slate-800">
            {formatPriceNumber(kpis.foodDeliveryFees)}
          </p>
          <p className="text-sm text-slate-600">{tStats("foodBlock.delivery")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-sky-50/50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-900">{tStats("marketplaceBlock.title")}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{formatPriceNumber(kpis.gmv)}</p>
          <p className="mt-1 text-sm text-slate-600">{tStats("marketplaceBlock.gmv")}</p>
          <p className="mt-3 text-lg font-semibold tabular-nums text-slate-800">
            {formatPriceNumber(kpis.commissions)}
          </p>
          <p className="text-sm text-slate-600">{tStats("marketplaceBlock.commissions")}</p>
        </div>
      </div>
    </div>
  )
}
