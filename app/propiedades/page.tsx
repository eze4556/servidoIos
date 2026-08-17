"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Filter, Building2, X } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { PropertyCatalogHero } from "@/components/properties/property-catalog-hero"
import { PropertiesFiltersPanel } from "@/components/properties/properties-filters-panel"
import { PropertyCard } from "@/components/properties/property-card"
import { PropertyResultsMap } from "@/components/properties/property-results-map"
import { fetchActivePropertyListings } from "@/lib/properties/property-listings"
import {
  filterPropertyListings,
  sortPropertyListings,
  type PropertyListFilters,
} from "@/lib/properties/filter-property-listings"
import type { PropertyListing } from "@/types/property-listing"

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
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.some((l) => l.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const patchFilters = (patch: Partial<PropertyListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const scrollToResults = () => {
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
        totalCount={filtered.length}
        filters={filters}
        onChange={patchFilters}
        onSearch={scrollToResults}
      />

      <div id="catalogo-propiedades" className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:px-6 md:pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              {t("resultsHeadline", { count: filtered.length })}
            </h2>
            <p className="text-sm text-slate-500">{t("catalogSubtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[170px] border-slate-200 bg-white text-sm text-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t("sortRecent")}</SelectItem>
                <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
                <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
                <SelectItem value="m2_desc">{t("sortM2Desc")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {t("filtersTitle")}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[240px_minmax(0,1fr)_360px]">
          <aside className="hidden lg:block">
            <div className="sticky top-20">{filtersPanel}</div>
          </aside>

          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 className="h-10 w-10 animate-spin text-servido-700" />
                <p className="text-sm text-slate-500">{t("loadingListings")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                <Building2 className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-lg font-medium text-slate-800">{t("emptyList")}</p>
                <p className="mt-2 text-sm text-slate-500">{t("emptyListHint")}</p>
                <Button asChild className="mt-6 bg-servido-800 font-semibold text-white hover:bg-servido-900">
                  <Link href="/dashboard/seller/properties">{t("publishCta")}</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((listing) => (
                  <PropertyCard
                    key={listing.id}
                    listing={listing}
                    selected={selectedId === listing.id}
                    onHover={() => setSelectedId(listing.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-20">
              <PropertyResultsMap listings={filtered} selectedId={selectedId} />
            </div>
          </aside>
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent
          side="bottom"
          className="z-[70] flex h-auto max-h-[min(88dvh,720px)] w-full flex-col gap-0 overflow-hidden rounded-t-2xl border-slate-200 bg-white p-0 sm:max-w-none [&>button]:hidden"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <SheetTitle className="text-left text-base font-bold text-slate-900">{t("filtersTitle")}</SheetTitle>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-slate-700">
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
          <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
