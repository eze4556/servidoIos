"use client"

import type { ReactNode } from "react"
import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Store } from "lucide-react"
import {
  DashboardMobileSidebar,
  DashboardSidebar,
  DashboardSidebarBackdrop,
} from "@/components/dashboard/dashboard-sidebar"
import { DashboardShellLayout } from "@/components/dashboard/dashboard-shell-layout"
import { buildSellerNavItems, getSellerPageMeta } from "@/components/dashboard/seller/seller-nav-config"

export type SellerDashboardTab =
  | "dashboard"
  | "products"
  | "addProduct"
  | "addService"
  | "agenda"
  | "shipping"
  | "earnings"
  | "create-coupons"
  | "resellerProgram"
  | "profile"

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
  const t = useTranslations("sellerDashboard")
  const navItems = useMemo(() => buildSellerNavItems(isEditing, t), [isEditing, t])
  const pageMeta = getSellerPageMeta(activeTab, isEditing, t)

  const sidebarProps = {
    variant: "seller" as const,
    panelTitle: t("panelTitle"),
    accountLabel: t("accountLabel"),
    activeTab,
    navItems,
    onNavigate,
    userName,
    userPhoto,
    onLogout,
    footerLinks: [{ label: t("footerStore"), href: storeHref || "/dashboard/seller", icon: Store }],
  }

  return (
    <DashboardShellLayout
      pageTitle={pageMeta.title}
      pageSubtitle={pageMeta.subtitle}
      headerAction={{ label: t("viewCatalog"), href: "/products" }}
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
