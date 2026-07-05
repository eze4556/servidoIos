"use client"

import { HomeServiceShortcuts } from "@/components/home/home-service-shortcuts"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"

export function HomeMobileHero() {
  return (
    <section className="lg:hidden">
      <MobileAppHeader showMenu={false} />
      <HomeServiceShortcuts />
    </section>
  )
}
