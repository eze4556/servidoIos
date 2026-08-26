"use client"

import Link from "next/link"
import { ArrowRight, Store, Wrench, Shield } from "lucide-react"
import { useTranslations } from "next-intl"

export function HomeAnimatedPromo() {
  const th = useTranslations("home")
  const tc = useTranslations("common")

  return (
    <section className="home-section home-section-delay-2 px-4 py-6 md:px-6 lg:px-8">
      <div className="container mx-auto max-w-screen-xl">
        <div className="home-animated-promo relative overflow-hidden rounded-3xl shadow-[0_28px_60px_-30px_rgba(46,16,101,0.55)] ring-1 ring-servido-950/20 lg:rounded-[2rem]">
          <div className="home-animated-gradient absolute inset-0" />
          <div className="home-hero-mesh pointer-events-none absolute inset-0 opacity-80" />
          <div className="pointer-events-none absolute -right-10 top-8 h-40 w-40 rounded-full bg-servido-gold/20 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center px-6 py-14 text-center sm:py-16 md:py-20 lg:px-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-servido-gold/90">
              {th("promoSoon")}
            </p>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              {tc("workingMessage")}
            </h2>
            <p className="mt-4 max-w-lg text-sm text-white/75 sm:text-base">{tc("comingSoonMessage")}</p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-white/75">
              <span className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-servido-gold" />
                {th("securePurchase")}
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Store className="h-4 w-4 text-servido-gold" />
                {tc("verifiedSellers")}
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-servido-gold" />
                {th("localServices")}
              </span>
            </div>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-2xl bg-servido-gold px-6 py-3 text-sm font-semibold text-servido-950 transition-all duration-300 hover:gap-3 hover:bg-[#ffe566]"
              >
                {th("exploreProducts")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=seller"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/18"
              >
                {th("startSelling")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
