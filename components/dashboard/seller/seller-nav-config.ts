import {
  CalendarDays,
  DollarSign,
  Home,
  PlusCircle,
  Settings,
  ShoppingBag,
  Share2,
  Truck,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
import type { DashboardNavItem } from "@/components/dashboard/dashboard-sidebar"
import type { SellerDashboardTab } from "@/components/dashboard/seller/seller-dashboard-shell"

type SellerNavTab = Exclude<SellerDashboardTab, "create-coupons">

const navTabIds: SellerNavTab[] = [
  "dashboard",
  "stats",
  "products",
  "addProduct",
  "addService",
  "agenda",
  "resellerProgram",
  "shipping",
  "claims",
  "earnings",
  "profile",
]

const navIcons = {
  dashboard: Home,
  stats: BarChart3,
  products: ShoppingBag,
  addProduct: PlusCircle,
  addService: PlusCircle,
  agenda: CalendarDays,
  resellerProgram: Share2,
  shipping: Truck,
  claims: AlertTriangle,
  earnings: DollarSign,
  profile: Settings,
} as const

const navGroups: Record<SellerNavTab, string> = {
  dashboard: "principal",
  stats: "principal",
  products: "tienda",
  addProduct: "tienda",
  addService: "tienda",
  agenda: "operaciones",
  resellerProgram: "tienda",
  shipping: "operaciones",
  claims: "operaciones",
  earnings: "operaciones",
  profile: "cuenta",
}

type SellerNavTranslate = (key: string) => string

export function buildSellerNavItems(isEditing: boolean, t: SellerNavTranslate): DashboardNavItem<SellerDashboardTab>[] {
  return navTabIds.map((id) => {
    const labelKey = id === "addProduct" && isEditing ? "nav.addProductEditing.label" : `nav.${id}.label`
    const descriptionKey =
      id === "addProduct" && isEditing ? "nav.addProductEditing.description" : `nav.${id}.description`

    return {
      id,
      label: t(labelKey),
      description: t(descriptionKey),
      icon: navIcons[id],
      group: navGroups[id],
    }
  })
}

export function getSellerPageMeta(
  activeTab: SellerDashboardTab,
  isEditing: boolean,
  t: SellerNavTranslate,
) {
  if (activeTab === "addProduct" && isEditing) {
    return {
      title: t("pages.addProductEditing.title"),
      subtitle: t("pages.addProductEditing.subtitle"),
    }
  }
  return {
    title: t(`pages.${activeTab}.title`),
    subtitle: t(`pages.${activeTab}.subtitle`),
  }
}
