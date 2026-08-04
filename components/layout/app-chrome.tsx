"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"
import { LocationPickerSheet } from "@/components/location/location-picker-sheet"
import { ChatUnreadProvider } from "@/components/chat/chat-unread-context"
import { DesktopChatFab } from "@/components/chat/desktop-chat-fab"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHomeRoute = pathname === "/"
  const isAdminRoute = pathname?.startsWith("/admin")
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname?.startsWith("/signup/")
  const isDashboardRoute = pathname?.startsWith("/dashboard")
  const isMessagingList = pathname?.startsWith("/mensajes")
  const isChatThread = pathname?.startsWith("/chat/")
  const isMessagingRoute = isMessagingList || isChatThread

  const showMobileHeader =
    !isHomeRoute &&
    !isAdminRoute &&
    !isAuthRoute &&
    !isDashboardRoute &&
    !isMessagingRoute

  if (isAdminRoute) {
    return <>{children}</>
  }

  if (isAuthRoute) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <ChatUnreadProvider>
      <div className="flex min-h-full max-w-[100vw] flex-1 flex-col overflow-x-hidden">
        {showMobileHeader && <MobileAppHeader />}
        {!isChatThread && (
          <div className="hidden lg:block">
            <Header />
          </div>
        )}
        <main
          className={`min-w-0 max-w-full flex-1 overflow-x-hidden ${
            isChatThread
              ? "pb-0"
              : isMessagingList
                ? "pb-16 lg:pb-0"
                : `pb-16 ${isHomeRoute ? "lg:pb-16" : ""}`
          }`}
        >
          {children}
        </main>
        {!isHomeRoute && !isMessagingRoute && (
          <div>
            <Footer />
          </div>
        )}
        {isHomeRoute && (
          <div className="hidden lg:block">
            <Footer />
          </div>
        )}
        {!isChatThread && <TabBar />}
        <DesktopChatFab />
        <LocationPickerSheet />
      </div>
    </ChatUnreadProvider>
  )
}
