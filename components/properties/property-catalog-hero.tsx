"use client"

import Link from "next/link"
import { Building2, Plus, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import type { PropertyOperation, PropertyType } from "@/types/property-listing"
import type { PropertyListFilters } from "@/lib/properties/filter-property-listings"
import { cn } from "@/lib/utils"

const QUICK_TYPES: PropertyType[] = ["casa", "departamento", "ph", "terreno", "local"]

const OPERATIONS: { id: PropertyOperation | "all"; labelKey: string }[] = [
  { id: "all", labelKey: "searchAll" },
  { id: "venta", labelKey: "searchBuy" },
  { id: "alquiler", labelKey: "searchRent" },
  { id: "alquiler_temporario", labelKey: "searchTemp" },
]

interface PropertyCatalogHeroProps {
  totalCount?: number
  filters: PropertyListFilters
  onChange: (patch: Partial<PropertyListFilters>) => void
  onSearch: () => void
}

export function PropertyCatalogHero({ totalCount, filters, onChange, onSearch }: PropertyCatalogHeroProps) {
  const t = useTranslations("properties")

  return (
    <section className="relative overflow-hidden border-b border-white/10 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700" />
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-purple-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-fuchsia-400/15 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25">
            <Building2 className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-200">{t("zoneBadge")}</p>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{t("heroTitle")}</h1>
          </div>
        </div>
        <Link
          href="/dashboard/seller/properties"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-servido-800 shadow-sm transition hover:bg-purple-50"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("publishCta")}</span>
          <span className="sm:hidden">{t("publishCtaShort")}</span>
        </Link>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-5 md:px-6 md:pb-6">
        <p className="mb-3 hidden text-sm text-purple-100/85 sm:block">{t("heroSubtitle")}</p>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/15">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {OPERATIONS.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => onChange({ operation: op.id })}
                className={cn(
                  "shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition",
                  filters.operation === op.id
                    ? "bg-servido-50 text-servido-900"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {t(op.labelKey)}
              </button>
            ))}
          </div>

          <form
            className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center md:grid-cols-[1fr_180px_auto_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              onSearch()
            }}
          >
            <label className="relative block">
              <span className="sr-only">{t("searchLocationPlaceholder")}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.searchTerm}
                onChange={(e) => onChange({ searchTerm: e.target.value, city: "" })}
                placeholder={t("searchLocationPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-servido-600 focus:bg-white focus:ring-2 focus:ring-servido-700/30"
              />
            </label>

            <select
              value={filters.propertyType}
              onChange={(e) => onChange({ propertyType: e.target.value as PropertyType | "all" })}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-servido-600 focus:bg-white focus:ring-2 focus:ring-servido-700/30"
            >
              <option value="all">{t("filterPropertyType")}</option>
              {QUICK_TYPES.concat(["galpon", "campo", "otro"]).map((pt) => (
                <option key={pt} value={pt}>
                  {t(`propertyType.${pt}`)}
                </option>
              ))}
            </select>

            <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200">
              {(["ARS", "USD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ priceCurrency: c })}
                  className={cn(
                    "flex-1 px-3 text-xs font-bold sm:px-4",
                    filters.priceCurrency === c ? "bg-servido-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-servido-800 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-servido-900"
            >
              {t("searchCta")}
              {typeof totalCount === "number" ? ` · ${totalCount}` : ""}
            </button>
          </form>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onChange({ propertyType: "all" })}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              filters.propertyType === "all" ? "bg-white text-servido-800" : "bg-white/10 text-white hover:bg-white/15"
            )}
          >
            {t("filterAll")}
          </button>
          {QUICK_TYPES.map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => onChange({ propertyType: pt })}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                filters.propertyType === pt ? "bg-white text-servido-800" : "bg-white/10 text-white hover:bg-white/15"
              )}
            >
              {t(`propertyType.${pt}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
