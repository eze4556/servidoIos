"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Filter, Plus, Building2, X } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useTranslations } from "next-intl"
import { PropertyCatalogHero } from "@/components/properties/property-catalog-hero"
import { PropertiesFiltersPanel } from "@/components/properties/properties-filters-panel"
import { PropertyCard } from "@/components/properties/property-card"
import { fetchActivePropertyListings } from "@/lib/properties/property-listings"
import {
  filterPropertyListings,
  sortPropertyListings,
  type PropertyListFilters,
} from "@/lib/properties/filter-property-listings"
import type { PropertyListing, PropertyType } from "@/types/property-listing"

const defaultFilters: PropertyListFilters = {
  searchTerm: "",
  priceCurrency: "ARS",
  minPrice: "",
  maxPrice: "",
  province: "all",
  city: "",
  propertyType: "all",
  operation: "all",
  minRooms: "",
  minCoveredM2: "",
}

export default function PropiedadesPage() {
  const t = useTranslations("properties")
  const [listings, setListings] = useState<PropertyListing[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PropertyListFilters>(defaultFilters)
  const [sortBy, setSortBy] = useState("recent")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchActivePropertyListings({ maxDocs: 200 })
      setListings(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const f = filterPropertyListings(listings, filters)
    return sortPropertyListings(f, sortBy as "recent" | "price_asc" | "price_desc" | "m2_desc")
  }, [listings, filters, sortBy])

  const patchFilters = (patch: Partial<PropertyListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const setQuickType = (type: PropertyType | "all") => {
    patchFilters({ propertyType: type })
    document.getElementById("catalogo-propiedades")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const filtersPanel = (
    <PropertiesFiltersPanel
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
      <PropertyCatalogHero
        totalCount={listings.length}
        propertyTypeFilter={filters.propertyType}
        onPropertyTypeChange={setQuickType}
      />

      <div id="catalogo-propiedades" className="mx-auto max-w-7xl px-2 pb-8 pt-6 sm:px-4 sm:pt-8 md:px-6 md:pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white md:text-xl">{t("catalogTitle")}</h2>
            <p className="text-sm text-indigo-200/70">{t("catalogSubtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/25 bg-white font-semibold text-servido-800 hover:bg-indigo-50 lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {t("filtersTitle")}
            </Button>
            <Button asChild size="sm" className="bg-white font-semibold text-servido-800 shadow-md hover:bg-indigo-50">
              <Link href="/dashboard/seller/properties">
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
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
                <p className="text-sm text-indigo-200/70">{t("loadingListings")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-servido-950/50 px-6 py-20 text-center">
                <Building2 className="mx-auto h-12 w-12 text-servido-700" />
                <p className="mt-4 text-lg font-medium text-white">{t("emptyList")}</p>
                <p className="mt-2 text-sm text-indigo-200/70">{t("emptyListHint")}</p>
                <Button asChild className="mt-6 bg-white font-semibold text-servido-800 hover:bg-indigo-50">
                  <Link href="/dashboard/seller/properties">{t("publishCta")}</Link>
                </Button>
              </div>
            ) : (
              <div className="grid auto-rows-min grid-cols-2 items-start gap-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((listing, index) => (
                  <PropertyCard key={listing.id} listing={listing} index={index} />
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
              </Button>
            </SheetClose>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <PropertiesFiltersPanel
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
