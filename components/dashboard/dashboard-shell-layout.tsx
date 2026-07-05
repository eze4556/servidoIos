import type { ReactNode } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface DashboardShellLayoutProps {
  pageTitle: string
  pageSubtitle: string
  headerAction?: { label: string; href: string }
  isMobileMenuOpen: boolean
  onMobileMenuOpenChange: (open: boolean) => void
  sidebar: ReactNode
  mobileSidebar: ReactNode
  children: ReactNode
  mainClassName?: string
}

export function DashboardShellLayout({
  pageTitle,
  pageSubtitle,
  headerAction,
  isMobileMenuOpen,
  onMobileMenuOpenChange,
  sidebar,
  mobileSidebar,
  children,
  mainClassName,
}: DashboardShellLayoutProps) {
  const panelMenu = (
    <Sheet open={isMobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-purple-100">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú del panel</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(300px,88vw)] border-none p-0">
        <SheetTitle className="sr-only">Menú del panel</SheetTitle>
        {mobileSidebar}
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="grid min-h-screen w-full bg-slate-50 lg:grid-cols-[300px_1fr]">
      {sidebar}

      <div className="flex min-w-0 flex-col">
        {/* Sub-header móvil: debajo del header morado global */}
        <header className="sticky top-[148px] z-30 border-b border-purple-100/80 bg-white/95 backdrop-blur-md lg:hidden">
          <div className="flex h-12 items-center gap-3 px-4">
            {panelMenu}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-servido-700">Mi panel</p>
              <h1 className="truncate text-base font-semibold text-gray-900">{pageTitle}</h1>
            </div>
          </div>
        </header>

        {/* Header desktop */}
        <header className="sticky top-0 z-20 hidden border-b border-purple-100/80 bg-white/90 backdrop-blur-md lg:block">
          <div className="flex h-16 items-center gap-3 px-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Mi panel</p>
              <h1 className="truncate text-xl font-semibold text-gray-900">{pageTitle}</h1>
              <p className="truncate text-sm text-gray-500">{pageSubtitle}</p>
            </div>
            {headerAction && (
              <Button
                asChild
                size="sm"
                className="shrink-0 rounded-full bg-servido-800 hover:bg-servido-900"
              >
                <Link href={headerAction.href}>{headerAction.label}</Link>
              </Button>
            )}
          </div>
        </header>

        <main className={cn("flex-1 px-4 py-5 md:px-6 md:py-8", mainClassName)}>{children}</main>
      </div>
    </div>
  )
}
