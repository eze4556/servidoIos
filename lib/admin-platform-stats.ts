import {
  bucketByMonth,
  countByName,
  lastNMonths,
  toJsDate,
  type NamedValue,
} from "@/lib/dashboard-stats"

export type AdminUserRow = {
  id: string
  role?: string
  isActive?: boolean
  createdAt?: Date | unknown
}

export type AdminProductRow = {
  category?: string
  isService?: boolean
  createdAt?: unknown
}

export type AdminPurchaseRow = {
  status?: string
  totalAmount?: number
  createdAt?: unknown
}

export type AdminFoodOrderRow = {
  status?: string
  paymentStatus?: string
  subtotal?: number
  deliveryFee?: number
  createdAt?: unknown
}

export function bucketCountByMonth(
  items: { date: Date | null }[],
  months: { key: string; label: string }[]
): { label: string; value: number }[] {
  const totals = new Map(months.map((m) => [m.key, 0]))
  for (const item of items) {
    if (!item.date) continue
    const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`
    if (!totals.has(key)) continue
    totals.set(key, (totals.get(key) || 0) + 1)
  }
  return months.map((m) => ({ label: m.label, value: totals.get(m.key) || 0 }))
}

export function buildAdminPlatformCharts(params: {
  users: AdminUserRow[]
  products: AdminProductRow[]
  purchases: AdminPurchaseRow[]
  foodOrders: AdminFoodOrderRow[]
  salesSummary: {
    totalVentas: number
    totalComisiones: number
    totalPendientePago: number
    totalPagado: number
    ventasPorVendedor: { vendedorNombre: string; totalVentas: number }[]
  }
  roleLabel: (role: string) => string
  statusLabel: (status: string) => string
  foodStatusLabel: (status: string) => string
  activeLabel: string
  inactiveLabel: string
  productLabel: string
  serviceLabel: string
  locale: string
  categoryNameById?: Record<string, string>
  unknownCategoryLabel?: string
}) {
  const months = lastNMonths(6, params.locale)
  const unknownCategory = params.unknownCategoryLabel || "—"
  const categoryName = (raw?: string) => {
    const key = (raw || "").trim()
    if (!key) return unknownCategory
    const resolved = params.categoryNameById?.[key]
    if (resolved && resolved !== key) return resolved
    if (/^[A-Za-z0-9_-]{16,}$/.test(key)) return unknownCategory
    return key
  }
  const approvedPurchases = params.purchases.filter((p) => p.status === "approved")

  const monthlySales = bucketByMonth(
    approvedPurchases.map((p) => ({
      date: toJsDate(p.createdAt),
      amount: Number(p.totalAmount) || 0,
    })),
    months
  )

  const monthlyOrders = bucketCountByMonth(
    params.purchases.map((p) => ({ date: toJsDate(p.createdAt) })),
    months
  )

  const monthlySignups = bucketCountByMonth(
    params.users.map((u) => ({ date: toJsDate(u.createdAt) })),
    months
  )

  const monthlyFoodRevenue = bucketByMonth(
    params.foodOrders
      .filter((o) => o.paymentStatus === "approved")
      .map((o) => ({
        date: toJsDate(o.createdAt),
        amount: Number(o.subtotal) || 0,
      })),
    months
  )

  const usersByRole = countByName(
    params.users.map((u) => params.roleLabel(u.role || "user"))
  ).slice(0, 6)

  const userActivity: NamedValue[] = [
    {
      name: params.activeLabel,
      value: params.users.filter((u) => u.isActive).length,
    },
    {
      name: params.inactiveLabel,
      value: params.users.filter((u) => !u.isActive).length,
    },
  ]

  const catalogSplit: NamedValue[] = [
    {
      name: params.productLabel,
      value: params.products.filter((p) => !p.isService).length,
    },
    {
      name: params.serviceLabel,
      value: params.products.filter((p) => p.isService).length,
    },
  ]

  const ordersByStatus = countByName(
    params.purchases.map((p) => params.statusLabel(p.status || "unknown"))
  )

  const foodByStatus = countByName(
    params.foodOrders.map((o) => params.foodStatusLabel(o.status || "unknown"))
  ).slice(0, 6)

  const topCategories = countByName(
    params.products.map((p) => categoryName(p.category))
  ).slice(0, 8)

  const topSellers = params.salesSummary.ventasPorVendedor
    .slice()
    .sort((a, b) => b.totalVentas - a.totalVentas)
    .slice(0, 8)
    .map((v) => ({ name: v.vendedorNombre || "—", value: Math.round(v.totalVentas * 100) / 100 }))

  const sellerPayouts: NamedValue[] = [
    { name: params.activeLabel.replace(/s$/i, "") || params.activeLabel, value: params.salesSummary.totalPagado },
    {
      name: params.inactiveLabel.replace(/s$/i, "") || params.inactiveLabel,
      value: params.salesSummary.totalPendientePago,
    },
  ]

  const foodApproved = params.foodOrders.filter((o) => o.paymentStatus === "approved")
  const foodGmv = foodApproved.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0)
  const foodDeliveryFees = foodApproved.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0)

  return {
    months,
    monthlySales,
    monthlyOrders,
    monthlySignups,
    monthlyFoodRevenue,
    usersByRole,
    userActivity,
    catalogSplit,
    ordersByStatus,
    foodByStatus,
    topCategories,
    topSellers,
    sellerPayouts,
    kpis: {
      users: params.users.length,
      products: params.products.length,
      orders: params.purchases.length,
      gmv: params.salesSummary.totalVentas,
      commissions: params.salesSummary.totalComisiones,
      foodOrders: params.foodOrders.length,
      foodGmv,
      foodDeliveryFees,
      cadetes: params.users.filter((u) => u.role === "cadete").length,
      sellers: params.users.filter((u) => u.role === "seller").length,
    },
  }
}
