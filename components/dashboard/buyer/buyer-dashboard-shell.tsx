import type { ReactNode } from "react"
import { CalendarDays, CreditCard, Heart, Home, MessageCircle, Settings, ShoppingBag, Sparkles } from "lucide-react"
import {
  DashboardMobileSidebar,
  DashboardSidebar,
  DashboardSidebarBackdrop,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-sidebar"
import { DashboardShellLayout } from "@/components/dashboard/dashboard-shell-layout"

export type BuyerDashboardTab =
  | "dashboard"
  | "orders"
  | "purchases"
  | "appointments"
  | "favorites"
  | "profile"

export const buyerNavItems: DashboardNavItem<BuyerDashboardTab>[] = [
  { id: "dashboard", label: "Resumen", icon: Home, description: "Actividad general", group: "principal" },
  { id: "orders", label: "Mis compras", icon: ShoppingBag, description: "Pedidos y envíos", group: "principal" },
  { id: "purchases", label: "Historial de pagos", icon: CreditCard, description: "Transacciones", group: "principal" },
  { id: "appointments", label: "Mis turnos", icon: CalendarDays, description: "Reservas de servicios", group: "principal" },
  { id: "favorites", label: "Favoritos", icon: Heart, description: "Guardados para después", group: "guardado" },
  { id: "profile", label: "Mi perfil", icon: Settings, description: "Cuenta y datos", group: "cuenta" },
]

const tabTitles: Record<BuyerDashboardTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Resumen", subtitle: "Tu actividad de compras de un vistazo" },
  orders: { title: "Mis compras", subtitle: "Seguí el estado de tus pedidos y envíos" },
  purchases: { title: "Historial de pagos", subtitle: "Detalle de todas tus transacciones" },
  appointments: { title: "Mis turnos", subtitle: "Reservas de servicios que pediste" },
  favorites: { title: "Favoritos", subtitle: "Productos que guardaste para más tarde" },
  profile: { title: "Mi perfil", subtitle: "Gestioná tu cuenta y preferencias" },
}

interface BuyerDashboardShellProps {
  activeTab: BuyerDashboardTab
  onTabChange: (tab: BuyerDashboardTab) => void
  userName?: string | null
  userPhoto?: string | null
  onLogout: () => void
  isMobileMenuOpen: boolean
  onMobileMenuOpenChange: (open: boolean) => void
  children: ReactNode
}

export function BuyerDashboardShell({
  activeTab,
  onTabChange,
  userName,
  userPhoto,
  onLogout,
  isMobileMenuOpen,
  onMobileMenuOpenChange,
  children,
}: BuyerDashboardShellProps) {
  const pageMeta = tabTitles[activeTab]

  const sidebarProps = {
    variant: "buyer" as const,
    panelTitle: "Panel comprador",
    accountLabel: "Cuenta de comprador",
    activeTab,
    navItems: buyerNavItems,
    onNavigate: onTabChange,
    userName,
    userPhoto,
    onLogout,
    footerLinks: [
      { label: "Chat / mensajes", href: "/mensajes", icon: MessageCircle },
      { label: "Explorar catálogo", href: "/products", icon: Sparkles },
    ],
  }

  return (
    <DashboardShellLayout
      pageTitle={pageMeta.title}
      pageSubtitle={pageMeta.subtitle}
      headerAction={{ label: "Explorar", href: "/products" }}
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuOpenChange={onMobileMenuOpenChange}
      sidebar={
        <DashboardSidebarBackdrop>
          <DashboardSidebar {...sidebarProps} />
        </DashboardSidebarBackdrop>
      }
      mobileSidebar={
        <DashboardMobileSidebar>
          <DashboardSidebar
            {...sidebarProps}
            onLogout={() => {
              onLogout()
              onMobileMenuOpenChange(false)
            }}
            onNavClick={() => onMobileMenuOpenChange(false)}
          />
        </DashboardMobileSidebar>
      }
    >
      {children}
    </DashboardShellLayout>
  )
}
