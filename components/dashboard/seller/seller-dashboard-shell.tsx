import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  DollarSign,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type SellerDashboardTab =
  | "dashboard"
  | "products"
  | "addProduct"
  | "addService"
  | "shipping"
  | "earnings"
  | "create-coupons"
  | "profile"

export interface SellerNavItem {
  id: SellerDashboardTab
  label: string
  icon: LucideIcon
}

const tabTitles: Record<SellerDashboardTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Resumen", subtitle: "Tu tienda y actividad de un vistazo" },
  products: { title: "Mis productos", subtitle: "Gestioná lo que tenés publicado" },
  addProduct: { title: "Publicar producto", subtitle: "Cargá un nuevo producto a tu tienda" },
  addService: { title: "Publicar servicio", subtitle: "Ofrecé un nuevo servicio" },
  shipping: { title: "Envíos", subtitle: "Gestioná el estado de tus envíos" },
  earnings: { title: "Mis ventas", subtitle: "Ingresos y transacciones" },
  "create-coupons": { title: "Cupones", subtitle: "Creá promociones para tus clientes" },
  profile: { title: "Configuración", subtitle: "Perfil, suscripción y Mercado Pago" },
}

function getNavItems(isEditing: boolean): SellerNavItem[] {
  return [
    { id: "dashboard", label: "Resumen", icon: Home },
    { id: "products", label: "Mis productos", icon: ShoppingBag },
    { id: "addProduct", label: isEditing ? "Editar producto" : "Añadir producto", icon: PlusCircle },
    { id: "addService", label: "Añadir servicio", icon: PlusCircle },
    { id: "shipping", label: "Envíos", icon: Truck },
    { id: "earnings", label: "Mis ventas", icon: DollarSign },
    { id: "create-coupons", label: "Crear cupones", icon: Tag },
    { id: "profile", label: "Configuración", icon: Settings },
  ]
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

function NavButton({
  item,
  active,
  onClick,
}: {
  item: SellerNavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
          : "text-purple-100/90 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </button>
  )
}

function SidebarContent({
  activeTab,
  navItems,
  onNavigate,
  onLogout,
  userName,
  userPhoto,
  storeHref,
  onNavClick,
}: {
  activeTab: SellerDashboardTab
  navItems: SellerNavItem[]
  onNavigate: (tab: SellerDashboardTab) => void
  onLogout: () => void
  userName?: string | null
  userPhoto?: string | null
  storeHref?: string
  onNavClick?: () => void
}) {
  const handleNav = (tab: SellerDashboardTab) => {
    onNavigate(tab)
    onNavClick?.()
  }

  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Image src="/images/logo.png" alt="Servido" width={28} height={28} className="h-7 w-7 object-contain" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Panel vendedor</p>
            <p className="text-[11px] text-purple-200">Servido Marketplace</p>
          </div>
        </Link>
      </div>

      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20">
            {userPhoto ? (
              <Image src={userPhoto} alt="" fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-5 w-5 text-purple-200" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{userName || "Vendedor"}</p>
            <p className="text-xs text-purple-200">Cuenta de vendedor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto px-3 py-4">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            onClick={() => handleNav(item.id)}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start rounded-xl text-purple-100 hover:bg-white/10 hover:text-white"
        >
          <Link href={storeHref || "/dashboard/seller"}>
            <Store className="mr-2 h-4 w-4" />
            Mi tienda
          </Link>
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </>
  )
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

  return (
    <div className="grid min-h-screen w-full bg-slate-50 lg:grid-cols-[280px_1fr]">
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d0057] via-purple-900 to-violet-950" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(168,85,247,0.2),transparent_55%)]" />
        <div className="relative z-10 flex h-full flex-col">
          <SidebarContent
            activeTab={activeTab}
            navItems={navItems}
            onNavigate={onNavigate}
            onLogout={onLogout}
            userName={userName}
            userPhoto={userPhoto}
            storeHref={storeHref}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-purple-100/80 bg-white/90 px-4 backdrop-blur-md lg:h-16 lg:px-6">
          <Sheet open={isMobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl border-purple-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none p-0">
              <SheetTitle className="sr-only">Menú del panel vendedor</SheetTitle>
              <div className="relative flex h-full flex-col">
                <div className="absolute inset-0 bg-gradient-to-b from-[#2d0057] via-purple-900 to-violet-950" />
                <div className="relative z-10 flex h-full flex-col">
                  <SidebarContent
                    activeTab={activeTab}
                    navItems={navItems}
                    onNavigate={onNavigate}
                    onLogout={() => {
                      onLogout()
                      onMobileMenuOpenChange(false)
                    }}
                    userName={userName}
                    userPhoto={userPhoto}
                    storeHref={storeHref}
                    onNavClick={() => onMobileMenuOpenChange(false)}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-gray-900 lg:text-xl">{pageMeta.title}</h1>
            <p className="hidden truncate text-sm text-gray-500 sm:block">{pageMeta.subtitle}</p>
          </div>

          <Button
            asChild
            size="sm"
            className="hidden rounded-full bg-purple-900 hover:bg-purple-800 sm:inline-flex"
          >
            <Link href="/products">Ver catálogo</Link>
          </Button>
        </header>

        <main className="flex-1 px-4 py-5 pb-20 md:px-6 md:py-8 md:pb-8">{children}</main>
      </div>
    </div>
  )
}
