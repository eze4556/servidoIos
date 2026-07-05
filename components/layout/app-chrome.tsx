"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHomeRoute = pathname === "/"
  const isAdminRoute = pathname?.startsWith("/admin")
  const isAuthRoute = pathname === "/login" || pathname === "/signup"
  const showMobileHeader = !isHomeRoute && !isAdminRoute && !isAuthRoute

  if (isAdminRoute) {
    return <>{children}</>
  }

  if (isAuthRoute) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {showMobileHeader && <MobileAppHeader />}
      <div className="hidden lg:block">
        <Header />
      </div>
      <main className={`flex-1 pb-16 ${isHomeRoute ? "lg:pb-16" : ""}`}>{children}</main>
      <div className={isHomeRoute ? "hidden lg:block" : undefined}>
        <Footer />
      </div>
      <TabBar />
    </div>
  )
}
