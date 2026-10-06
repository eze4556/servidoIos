"use client"

import type React from "react"
import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { TabBar } from "@/components/layout/tab-bar"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"
import { LocationPickerSheet } from "@/components/location/location-picker-sheet"
import { ChatUnreadProvider } from "@/components/chat/chat-unread-context"
import { DesktopChatFab } from "@/components/chat/desktop-chat-fab"
import { TutorialProvider } from "@/components/tutorial/tutorial-provider"
import { AppTutorialDialog } from "@/components/tutorial/app-tutorial-dialog"
import { TutorialFab } from "@/components/tutorial/tutorial-fab"
import { HelpBotWidget } from "@/components/help-bot/help-bot-widget"
import { LiveFollowerBanner } from "@/components/lives/live-follower-banner"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHomeRoute = pathname === "/"
  const isAdminRoute = pathname?.startsWith("/admin")
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname?.startsWith("/signup/")
  const isDashboardRoute = pathname?.startsWith("/dashboard")
  const isAutosRoute = pathname?.startsWith("/autos")
  const isPropiedadesRoute = pathname?.startsWith("/propiedades")
  const isVerticalCatalogRoute = isAutosRoute || isPropiedadesRoute
  const isMessagingList = pathname?.startsWith("/mensajes")
  const isChatThread = pathname?.startsWith("/chat")
  const isLiveImmersive =
    pathname?.startsWith("/lives/") || pathname?.startsWith("/dashboard/seller/live")
  const isMessagingRoute = isMessagingList || isChatThread
  // /lives?id=… (APK) también es fullscreen; el overlay z-[80] tapa la tab bar.
  const isFullscreenChrome = isChatThread || isLiveImmersive

  const showMobileHeader =
    !isHomeRoute &&
    !isAdminRoute &&
    !isAuthRoute &&
    !isDashboardRoute &&
    !isMessagingRoute &&
    !isLiveImmersive

  if (isAdminRoute) {
    return <>{children}</>
  }

  if (isAuthRoute) {
    return (
      <main className="flex-1 pt-[env(safe-area-inset-top)] lg:pt-0">{children}</main>
    )
  }

  // Mensajería y lives manejan su propio safe-area a pantalla completa.
  const needsTopInset = !showMobileHeader && !isMessagingRoute && !isLiveImmersive

  return (
    <ChatUnreadProvider>
      <TutorialProvider>
        <>
          <div
            className={`flex min-h-full max-w-[100vw] flex-1 flex-col overflow-x-hidden ${
              needsTopInset ? "pt-[env(safe-area-inset-top)] lg:pt-0" : ""
            }`}
          >
            {showMobileHeader && <MobileAppHeader />}
            {!isFullscreenChrome && (
              <div className="hidden lg:block">
                <Header />
              </div>
            )}
            <main
              className={`min-w-0 max-w-full flex-1 overflow-x-hidden ${
                isFullscreenChrome
                  ? "pb-0"
                  : isMessagingList
                    ? "pb-[7rem] lg:pb-0"
                    : isVerticalCatalogRoute
                      ? "bg-servido-950 pb-[7rem] lg:pb-0"
                      : `pb-[7rem] ${isHomeRoute ? "lg:pb-16" : ""}`
              }`}
            >
              {children}
            </main>
            {!isHomeRoute && !isMessagingRoute && !isLiveImmersive && (
              <div className={isVerticalCatalogRoute ? "hidden lg:block" : undefined}>
                <Footer />
              </div>
            )}
            {isHomeRoute && (
              <div className="hidden lg:block">
                <Footer />
              </div>
            )}
            {!isFullscreenChrome && <DesktopChatFab />}
            <LocationPickerSheet />
            {!isFullscreenChrome && <TutorialFab />}
            {!isFullscreenChrome && <HelpBotWidget />}
            <AppTutorialDialog />
            {!isFullscreenChrome && <LiveFollowerBanner />}
          </div>
          {!isFullscreenChrome && (
            <Suspense fallback={null}>
              <TabBar />
            </Suspense>
          )}
        </>
      </TutorialProvider>
    </ChatUnreadProvider>
  )
}
