"use client"

import Link from "next/link"
import { ArrowRight, BadgeCheck, Building2, KeyRound, MapPin, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import type { PropertyOperation, PropertyType } from "@/types/property-listing"
import { cn } from "@/lib/utils"

const QUICK_TYPES: PropertyType[] = ["casa", "departamento", "terreno", "local", "galpon"]

interface PropertyCatalogHeroProps {
  totalCount?: number
  propertyTypeFilter: PropertyType | "all"
  onPropertyTypeChange: (type: PropertyType | "all") => void
}

export function PropertyCatalogHero({
  totalCount,
  propertyTypeFilter,
  onPropertyTypeChange,
}: PropertyCatalogHeroProps) {
  const t = useTranslations("properties")

  return (
    <section className="vehicles-hero-enter relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-servido-950 to-servido-900" />
      <div className="pointer-events-none absolute -left-16 top-8 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-white/5 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.15fr_0.85fr] md:px-6 md:py-16 lg:items-center">
        <div className="vehicles-hero-enter-delay-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-servido-800">
            <Sparkles className="h-3.5 w-3.5" />
            {t("zoneBadge")}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-indigo-100/90 md:text-lg">{t("heroSubtitle")}</p>

          <ul className="mt-6 flex flex-wrap gap-4 text-sm text-indigo-100/85">
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-white" />
              {t("heroTrustFree")}
            </li>
            <li className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-200" />
              {t("heroTrustOps")}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-200" />
              {t("heroTrustLocal")}
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/seller/properties"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-servido-800 shadow-xl transition hover:bg-indigo-50"
            >
              {t("publishCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#catalogo-propiedades"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              {t("browseCatalog")}
            </a>
          </div>
        </div>

        <div className="vehicles-hero-enter-delay-2 relative hidden md:block">
          <div className="vehicles-float relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl">
            <Building2 className="relative mx-auto h-28 w-28 text-servido-800" strokeWidth={1.1} />
            <p className="relative mt-4 text-center text-sm font-semibold text-servido-800">{t("heroCardTagline")}</p>
            {typeof totalCount === "number" && (
              <p className="relative mt-2 text-center text-3xl font-bold text-servido-900">{totalCount}</p>
            )}
            <p className="relative text-center text-xs uppercase tracking-widest text-servido-700">{t("heroCardListings")}</p>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-servido-950/50">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-200/70">{t("quickTypes")}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onPropertyTypeChange("all")}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                propertyTypeFilter === "all" ? "bg-white text-servido-800 shadow-md" : "bg-white/10 text-white hover:bg-white/15"
              )}
            >
              {t("filterAll")}
            </button>
            {QUICK_TYPES.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => onPropertyTypeChange(pt)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  propertyTypeFilter === pt ? "bg-white text-servido-800 shadow-md" : "bg-white/10 text-white hover:bg-white/15"
                )}
              >
                {t(`propertyType.${pt}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
