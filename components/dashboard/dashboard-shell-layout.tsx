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
  return (
    <div className="grid min-h-screen w-full bg-slate-50 lg:grid-cols-[300px_1fr]">
      {sidebar}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 border-b border-purple-100/80 bg-white/90 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:px-6">
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
              <SheetContent side="left" className="w-[min(300px,88vw)] border-none p-0">
                <SheetTitle className="sr-only">Menú del panel</SheetTitle>
                {mobileSidebar}
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Mi panel</p>
              <h1 className="truncate text-base font-semibold text-gray-900 lg:text-xl">{pageTitle}</h1>
              <p className="hidden truncate text-sm text-gray-500 sm:block">{pageSubtitle}</p>
            </div>

            {headerAction && (
              <Button
                asChild
                size="sm"
                className="hidden shrink-0 rounded-full bg-servido-800 hover:bg-servido-900 sm:inline-flex"
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
