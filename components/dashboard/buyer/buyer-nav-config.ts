import { CalendarDays, CreditCard, Heart, Home, Settings, ShoppingBag, TrendingUp, BarChart3 } from "lucide-react"
import type { DashboardNavItem } from "@/components/dashboard/dashboard-sidebar"
import type { BuyerDashboardTab } from "@/components/dashboard/buyer/buyer-dashboard-shell"

const tabIds: BuyerDashboardTab[] = [
  "dashboard",
  "stats",
  "orders",
  "purchases",
  "appointments",
  "favorites",
  "reseller",
  "profile",
]

const tabIcons = {
  dashboard: Home,
  stats: BarChart3,
  orders: ShoppingBag,
  purchases: CreditCard,
  appointments: CalendarDays,
  favorites: Heart,
  reseller: TrendingUp,
  profile: Settings,
} as const

const tabGroups: Record<BuyerDashboardTab, string> = {
  dashboard: "principal",
  stats: "principal",
  orders: "principal",
  purchases: "principal",
  appointments: "principal",
  favorites: "guardado",
  reseller: "guardado",
  profile: "cuenta",
}

type BuyerNavTranslate = (key: string) => string

export function buildBuyerNavItems(t: BuyerNavTranslate): DashboardNavItem<BuyerDashboardTab>[] {
  return tabIds.map((id) => ({
    id,
    label: t(`nav.${id}.label`),
    description: t(`nav.${id}.description`),
    icon: tabIcons[id],
    group: tabGroups[id],
  }))
}

export function getBuyerPageMeta(activeTab: BuyerDashboardTab, t: BuyerNavTranslate) {
  return {
    title: t(`pages.${activeTab}.title`),
    subtitle: t(`pages.${activeTab}.subtitle`),
  }
}
