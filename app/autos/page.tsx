"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Filter, Plus, Car, X } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { useTranslations } from "next-intl"
import { VehiclesCatalogHero } from "@/components/vehicles/vehicles-catalog-hero"
import { VehiclesFiltersPanel } from "@/components/vehicles/vehicles-filters-panel"
import { VehicleCard } from "@/components/vehicles/vehicle-card"
import { fetchActiveVehicleListings } from "@/lib/vehicles/vehicle-listings"
import {
  filterVehicleListings,
  sortVehicleListings,
  type VehicleListFilters,
} from "@/lib/vehicles/filter-vehicle-listings"
import type { VehicleListing, VehicleType } from "@/types/vehicle-listing"

const defaultFilters: VehicleListFilters = {
  searchTerm: "",
  priceCurrency: "ARS",
  minPrice: "",
  maxPrice: "",
  province: "all",
  city: "",
  make: "all",
  model: "all",
  vehicleType: "all",
  minYear: "",
  maxYear: "",
  maxMileage: "",
}

export default function AutosPage() {
  const t = useTranslations("vehicles")
  const [listings, setListings] = useState<VehicleListing[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<VehicleListFilters>(defaultFilters)
  const [sortBy, setSortBy] = useState("recent")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchActiveVehicleListings({ maxDocs: 200 })
      setListings(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const f = filterVehicleListings(listings, filters)
    return sortVehicleListings(f, sortBy as "recent" | "price_asc" | "price_desc" | "year_desc")
  }, [listings, filters, sortBy])

  const patchFilters = (patch: Partial<VehicleListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const setQuickType = (type: VehicleType | "all") => {
    patchFilters({ vehicleType: type })
    document.getElementById("catalogo-autos")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const filtersPanel = (
    <VehiclesFiltersPanel
      filters={filters}
      onChange={patchFilters}
      sortBy={sortBy}
      onSortByChange={setSortBy}
      onClear={() => setFilters({ ...defaultFilters, priceCurrency: filters.priceCurrency })}
      resultCount={filtered.length}
    />
  )

  return (
    <>
      <VehiclesCatalogHero
        totalCount={listings.length}
        vehicleTypeFilter={filters.vehicleType}
        onVehicleTypeChange={setQuickType}
      />

      <div id="catalogo-autos" className="mx-auto max-w-7xl px-2 pb-8 pt-6 sm:px-4 sm:pt-8 md:px-6 md:pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white md:text-xl">{t("catalogTitle")}</h2>
            <p className="text-sm text-purple-200/70">{t("catalogSubtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/25 bg-white font-semibold text-servido-800 hover:bg-purple-50 lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {t("filtersTitle")}
            </Button>
            <Button asChild size="sm" className="bg-white font-semibold text-servido-800 shadow-md hover:bg-purple-50">
              <Link href="/dashboard/seller/vehicles">
                <Plus className="mr-2 h-4 w-4" />
                {t("publishCtaShort")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-20">{filtersPanel}</div>
          </aside>

          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
                <p className="text-sm text-purple-200/70">{t("loadingListings")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-servido-950/50 px-6 py-20 text-center">
                <Car className="mx-auto h-12 w-12 text-servido-700" />
                <p className="mt-4 text-lg font-medium text-white">{t("emptyList")}</p>
                <p className="mt-2 text-sm text-purple-200/70">{t("emptyListHint")}</p>
                <Button asChild className="mt-6 bg-white font-semibold text-servido-800 hover:bg-purple-50">
                  <Link href="/dashboard/seller/vehicles">{t("publishCta")}</Link>
                </Button>
              </div>
            ) : (
              <div className="grid auto-rows-min grid-cols-2 items-start gap-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((listing, index) => (
                  <VehicleCard key={listing.id} listing={listing} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent
          side="bottom"
          className="z-[70] flex h-auto max-h-[min(88dvh,720px)] w-full flex-col gap-0 overflow-hidden rounded-t-2xl border-servido-200 bg-white p-0 sm:max-w-none [&>button]:hidden"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-servido-100 px-4 py-3">
            <SheetTitle className="text-left text-base font-bold text-servido-900">{t("filtersTitle")}</SheetTitle>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-servido-800">
                <X className="h-5 w-5" />
                <span className="sr-only">{t("backToCatalog")}</span>
              </Button>
            </SheetClose>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <VehiclesFiltersPanel
              embedded
              filters={filters}
              onChange={patchFilters}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onClear={() => setFilters({ ...defaultFilters, priceCurrency: filters.priceCurrency })}
              resultCount={filtered.length}
            />
          </div>
          <div className="shrink-0 border-t border-servido-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-11 w-full bg-servido-800 font-semibold text-white hover:bg-servido-900"
              onClick={() => setMobileFiltersOpen(false)}
            >
              {t("filtersApply", { count: filtered.length })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
