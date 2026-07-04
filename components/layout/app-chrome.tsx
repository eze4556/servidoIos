"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { DemoModeBanner } from "@/components/demo/demo-mode-banner"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DemoModeBanner />
      <Header />
      <main className="flex-1 pb-16 md:pb-16">{children}</main>
      <Footer />
      <TabBar />
    </div>
  )
}
