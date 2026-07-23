import type { ReactNode } from "react"
import {
  CalendarDays,
  DollarSign,
  Home,
  PlusCircle,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  Truck,
} from "lucide-react"
import {
  DashboardMobileSidebar,
  DashboardSidebar,
  DashboardSidebarBackdrop,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-sidebar"
import { DashboardShellLayout } from "@/components/dashboard/dashboard-shell-layout"

export type SellerDashboardTab =
  | "dashboard"
  | "products"
  | "addProduct"
  | "addService"
  | "agenda"
  | "shipping"
  | "earnings"
  | "create-coupons"
  | "profile"

function getNavItems(isEditing: boolean): DashboardNavItem<SellerDashboardTab>[] {
  return [
    { id: "dashboard", label: "Resumen", icon: Home, description: "Métricas de tu tienda", group: "principal" },
    { id: "products", label: "Mis productos", icon: ShoppingBag, description: "Publicaciones activas", group: "tienda" },
    {
      id: "addProduct",
      label: isEditing ? "Editar producto" : "Añadir producto",
      icon: PlusCircle,
      description: "Nueva publicación",
      group: "tienda",
    },
    { id: "addService", label: "Añadir servicio", icon: PlusCircle, description: "Ofrecer un servicio", group: "tienda" },
    { id: "agenda", label: "Agenda", icon: CalendarDays, description: "Turnos y horarios", group: "operaciones" },
    { id: "create-coupons", label: "Crear cupones", icon: Tag, description: "Promociones", group: "tienda" },
    { id: "shipping", label: "Envíos", icon: Truck, description: "Estado de entregas", group: "operaciones" },
    { id: "earnings", label: "Mis ventas", icon: DollarSign, description: "Ingresos y pagos", group: "operaciones" },
    { id: "profile", label: "Configuración", icon: Settings, description: "Perfil y suscripción", group: "cuenta" },
  ]
}

const tabTitles: Record<SellerDashboardTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Resumen", subtitle: "Tu tienda y actividad de un vistazo" },
  products: { title: "Mis productos", subtitle: "Gestioná lo que tenés publicado" },
  addProduct: { title: "Publicar producto", subtitle: "Cargá un nuevo producto a tu tienda" },
  addService: { title: "Publicar servicio", subtitle: "Ofrecé un nuevo servicio" },
  agenda: { title: "Agenda de servicios", subtitle: "Horarios y turnos de tus clientes" },
  shipping: { title: "Envíos", subtitle: "Gestioná el estado de tus envíos" },
  earnings: { title: "Mis ventas", subtitle: "Ingresos y transacciones" },
  "create-coupons": { title: "Cupones", subtitle: "Creá promociones para tus clientes" },
  profile: { title: "Configuración", subtitle: "Perfil, suscripción y Mercado Pago" },
}

interface SellerDashboardShellProps {
  activeTab: SellerDashboardTab
  onNavigate: (tab: SellerDashboardTab) => void
  isEditing?: boolean
  userName?: string | null
  userPhoto?: string | null
  storeHref?: string
  onLogout: () => void
  isMobileMenuOpen: boolean
  onMobileMenuOpenChange: (open: boolean) => void
  children: ReactNode
}

export function SellerDashboardShell({
  activeTab,
  onNavigate,
  isEditing = false,
  userName,
  userPhoto,
  storeHref,
  onLogout,
  isMobileMenuOpen,
  onMobileMenuOpenChange,
  children,
}: SellerDashboardShellProps) {
  const pageMeta =
    activeTab === "addProduct" && isEditing
      ? { title: "Editar producto", subtitle: "Modificá los datos de tu publicación" }
      : tabTitles[activeTab]

  const navItems = getNavItems(isEditing)

  const sidebarProps = {
    variant: "seller" as const,
    panelTitle: "Panel vendedor",
    accountLabel: "Cuenta de vendedor",
    activeTab,
    navItems,
    onNavigate,
    userName,
    userPhoto,
    onLogout,
    footerLinks: [{ label: "Mi tienda", href: storeHref || "/dashboard/seller", icon: Store }],
  }

  return (
    <DashboardShellLayout
      pageTitle={pageMeta.title}
      pageSubtitle={pageMeta.subtitle}
      headerAction={{ label: "Ver catálogo", href: "/products" }}
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuOpenChange={onMobileMenuOpenChange}
      mainClassName="pb-20 md:pb-8"
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
