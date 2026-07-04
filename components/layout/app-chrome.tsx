"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")
  const isAuthRoute = pathname === "/login" || pathname === "/signup"

  if (isAdminRoute) {
    return <>{children}</>
  }

  if (isAuthRoute) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-16">{children}</main>
      <Footer />
      <TabBar />
    </div>
  )
}
