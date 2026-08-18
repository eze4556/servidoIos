"use client"

import type { ReactNode } from "react"
import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { MessageCircle, Sparkles } from "lucide-react"
import {
  DashboardMobileSidebar,
  DashboardSidebar,
  DashboardSidebarBackdrop,
} from "@/components/dashboard/dashboard-sidebar"
import { DashboardShellLayout } from "@/components/dashboard/dashboard-shell-layout"
import { buildBuyerNavItems, getBuyerPageMeta } from "@/components/dashboard/buyer/buyer-nav-config"

export type BuyerDashboardTab =
  | "dashboard"
  | "stats"
  | "orders"
  | "purchases"
  | "appointments"
  | "favorites"
  | "reseller"
  | "profile"


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
  const t = useTranslations("buyerDashboard")
  const navItems = useMemo(() => buildBuyerNavItems(t), [t])
  const pageMeta = getBuyerPageMeta(activeTab, t)

  const sidebarProps = {
    variant: "buyer" as const,
    panelTitle: t("panelTitle"),
    accountLabel: t("accountLabel"),
    activeTab,
    navItems,
    onNavigate: onTabChange,
    userName,
    userPhoto,
    onLogout,
    footerLinks: [
      { label: t("footerChat"), href: "/mensajes", icon: MessageCircle },
      { label: t("footerCatalog"), href: "/products", icon: Sparkles },
    ],
  }

  return (
    <DashboardShellLayout
      pageTitle={pageMeta.title}
      pageSubtitle={pageMeta.subtitle}
      headerAction={{ label: t("explore"), href: "/products" }}
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
