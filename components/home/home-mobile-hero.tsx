"use client"

import { HomeServiceShortcuts } from "@/components/home/home-service-shortcuts"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"
import { HomeStoriesSection } from "@/components/stories/home-stories-section"

export function HomeMobileHero() {
  return (
    <section className="lg:hidden">
      <MobileAppHeader showMenu={false} />
      <div className="px-4 pb-1 pt-3">
        <HomeStoriesSection />
      </div>
      <HomeServiceShortcuts />
    </section>
  )
}
