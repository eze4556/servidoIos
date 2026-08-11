"use client"

import Link from "next/link"
import { ArrowRight, Building2, Shield } from "lucide-react"
import { useTranslations } from "next-intl"

export function HomePropertiesSpotlight() {
  const th = useTranslations("home")
  const tp = useTranslations("properties")

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-servido-950 to-servido-900 p-[1px] shadow-xl ring-1 ring-white/10">
      <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.3),transparent_55%)]" />

        <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center md:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Building2 className="h-5 w-5 text-white" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">{tp("zoneBadge")}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{th("propertiesSpotlightTitle")}</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-indigo-100/85 sm:text-base">
              {th("propertiesSpotlightDesc")}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-200">
              <Shield className="h-3.5 w-3.5" />
              {tp("publishFreeNote")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href="/propiedades"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-servido-800 shadow-lg transition hover:bg-indigo-50"
            >
              {th("propertiesSpotlightCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/seller/properties"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              {tp("publishCtaShort")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
