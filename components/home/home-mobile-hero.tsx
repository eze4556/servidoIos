"use client"

import { HomeServiceShortcuts } from "@/components/home/home-service-shortcuts"
import { HomeBannerCarousel } from "@/components/home/home-banner-carousel"
import { MobileAppHeader } from "@/components/layout/mobile-app-header"
import { HomeStoriesSection } from "@/components/stories/home-stories-section"
import { HomeVehiclesSpotlight } from "@/components/home/home-vehicles-spotlight"
import { HomePropertiesSpotlight } from "@/components/home/home-properties-spotlight"

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

      <div className="px-4 pb-2 pt-4">
        <HomeVehiclesSpotlight />
      </div>
      <div className="px-4 pb-4 pt-2">
        <HomePropertiesSpotlight />
      </div>
    </section>
  )
}
