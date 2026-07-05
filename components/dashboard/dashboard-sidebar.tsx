import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, LogOut, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DashboardNavItem<T extends string = string> {
  id: T
  label: string
  icon: LucideIcon
  description?: string
  group?: string
}

interface DashboardSidebarProps<T extends string> {
  variant: "buyer" | "seller"
  panelTitle: string
  accountLabel: string
  activeTab: T
  navItems: DashboardNavItem<T>[]
  onNavigate: (tab: T) => void
  userName?: string | null
  userPhoto?: string | null
  onLogout: () => void
  footerLinks?: { label: string; href: string; icon: LucideIcon }[]
  onNavClick?: () => void
}

const groupLabels: Record<string, string> = {
  principal: "Principal",
  tienda: "Tienda",
  operaciones: "Operaciones",
  guardado: "Guardado",
  cuenta: "Cuenta",
}

function groupNavItems<T extends string>(items: DashboardNavItem<T>[]) {
  const groups: { key: string; items: DashboardNavItem<T>[] }[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const key = item.group || "principal"
    if (!seen.has(key)) {
      seen.add(key)
      groups.push({ key, items: [] })
    }
    groups.find((g) => g.key === key)?.items.push(item)
  }

  return groups
}

function NavButton<T extends string>({
  item,
  active,
  onClick,
}: {
  item: DashboardNavItem<T>
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200",
        active
          ? "bg-white/15 text-white shadow-lg shadow-purple-950/20 ring-1 ring-white/25"
          : "text-purple-100/85 hover:bg-white/10 hover:text-white"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
      )}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-white text-purple-900 shadow-sm"
            : "bg-white/10 text-purple-100 ring-1 ring-white/10 group-hover:bg-white/15"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">{item.label}</span>
        {item.description && (
          <span
            className={cn(
              "mt-0.5 block truncate text-[11px] leading-tight",
              active ? "text-purple-100/90" : "text-purple-200/70"
            )}
          >
            {item.description}
          </span>
        )}
      </span>
    </button>
  )
}

export function DashboardSidebar<T extends string>({
  variant,
  panelTitle,
  accountLabel,
  activeTab,
  navItems,
  onNavigate,
  userName,
  userPhoto,
  onLogout,
  footerLinks = [],
  onNavClick,
}: DashboardSidebarProps<T>) {
  const groups = groupNavItems(navItems)

  const handleNav = (tab: T) => {
    onNavigate(tab)
    onNavClick?.()
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-servido-950 via-servido-900 to-servido-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_0%_0%,rgba(76,29,149,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(59,7,100,0.25),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Header */}
        <div className="px-4 pb-4 pt-5">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-purple-100 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>

          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-lg shadow-black/15 ring-[3px] ring-white/30">
              <Image
                src="/images/logo-192.png"
                alt="Servido"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </span>
            <div className="min-w-0">
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-100">
                <Sparkles className="h-3 w-3" />
                {variant === "buyer" ? "Comprador" : "Vendedor"}
              </span>
              <p className="truncate text-sm font-bold text-white">{panelTitle}</p>
              <p className="text-[11px] font-medium text-purple-200/90">Servido</p>
            </div>
          </Link>
        </div>

        {/* Perfil */}
        <div className="px-4 pb-2">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-purple-800/50 ring-2 ring-white/25">
                {userPhoto ? (
                  <Image src={userPhoto} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-5 w-5 text-purple-200" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{userName || "Usuario"}</p>
                <p className="truncate text-xs text-purple-200/90">{accountLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-5 overflow-auto px-3 py-4">
          {groups.map(({ key, items }) => (
            <div key={key}>
              {groups.length > 1 && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300/80">
                  {groupLabels[key] || key}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={activeTab === item.id}
                    onClick={() => handleNav(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="space-y-2 border-t border-white/10 p-4">
          {footerLinks.map(({ label, href, icon: Icon }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className="h-10 w-full justify-start rounded-xl bg-white/5 text-purple-100 hover:bg-white/10 hover:text-white"
            >
              <Link href={href}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DashboardSidebarBackdrop({ children }: { children: ReactNode }) {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:w-[300px] lg:shrink-0 lg:flex-col">
      {children}
    </aside>
  )
}

export function DashboardMobileSidebar({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-servido-950 via-servido-900 to-servido-950" />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  )
}
