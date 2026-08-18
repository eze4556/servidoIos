"use client"

import Link from "next/link"
import { Car, Plus, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import type { VehicleCondition, VehicleType } from "@/types/vehicle-listing"
import type { VehicleListFilters } from "@/lib/vehicles/filter-vehicle-listings"
import { VEHICLE_MAKES } from "@/lib/vehicles/vehicle-catalog"
import { cn } from "@/lib/utils"

const QUICK_TYPES: VehicleType[] = ["auto", "suv_pickup", "moto", "utilitario", "camion"]

const CONDITIONS: { id: VehicleCondition | "all"; labelKey: string }[] = [
  { id: "all", labelKey: "searchAll" },
  { id: "0km", labelKey: "searchNew" },
  { id: "usado", labelKey: "searchUsed" },
]

interface VehiclesCatalogHeroProps {
  totalCount?: number
  filters: VehicleListFilters
  onChange: (patch: Partial<VehicleListFilters>) => void
  onSearch: () => void
}

export function VehiclesCatalogHero({ totalCount, filters, onChange, onSearch }: VehiclesCatalogHeroProps) {
  const t = useTranslations("vehicles")

  return (
    <section className="relative overflow-hidden border-b border-white/10 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700" />
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-purple-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25">
            <Car className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-200">{t("zoneBadge")}</p>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{t("heroTitle")}</h1>
          </div>
        </div>
        <Link
          href="/dashboard/seller/vehicles"
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
            {CONDITIONS.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => onChange({ condition: op.id })}
                className={cn(
                  "shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition",
                  filters.condition === op.id
                    ? "bg-servido-50 text-servido-900"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {t(op.labelKey)}
              </button>
            ))}
          </div>

          <form
            className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_150px_150px_auto_auto] lg:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              onSearch()
            }}
          >
            <label className="relative block sm:col-span-2 lg:col-span-1">
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
              value={filters.make}
              onChange={(e) => onChange({ make: e.target.value, model: "all" })}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-servido-600 focus:bg-white focus:ring-2 focus:ring-servido-700/30"
            >
              <option value="all">{t("filterMake")}</option>
              {VEHICLE_MAKES.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>

            <select
              value={filters.vehicleType}
              onChange={(e) => onChange({ vehicleType: e.target.value as VehicleType | "all" })}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-servido-600 focus:bg-white focus:ring-2 focus:ring-servido-700/30"
            >
              <option value="all">{t("filterVehicleType")}</option>
              {QUICK_TYPES.concat("otro").map((vt) => (
                <option key={vt} value={vt}>
                  {t(`vehicleType.${vt}`)}
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
            onClick={() => onChange({ vehicleType: "all" })}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              filters.vehicleType === "all" ? "bg-white text-servido-800" : "bg-white/10 text-white hover:bg-white/15"
            )}
          >
            {t("filterAll")}
          </button>
          {QUICK_TYPES.map((vt) => (
            <button
              key={vt}
              type="button"
              onClick={() => onChange({ vehicleType: vt })}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                filters.vehicleType === vt ? "bg-white text-servido-800" : "bg-white/10 text-white hover:bg-white/15"
              )}
            >
              {t(`vehicleType.${vt}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
