"use client"

import { HomeServiceShortcuts } from "@/components/home/home-service-shortcuts"
import { HomeBannerCarousel } from "@/components/home/home-banner-carousel"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"
import { HomeStoriesSection } from "@/components/stories/home-stories-section"

/** Orden fijo del home mobile: navbar → historias → banner → categorías */
export function HomeMobileHero() {
  return (
    <section className="lg:hidden">
      <MobileAppHeader showMenu={false} />

      <div className="px-4 pb-1 pt-3">
        <HomeStoriesSection />
      </div>

      <div className="px-4 pt-3">
        <HomeBannerCarousel variant="mobile" />
      </div>

      <HomeServiceShortcuts />
    </section>
  )
}
