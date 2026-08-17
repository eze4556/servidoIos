"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { ARGENTINA_PROVINCES } from "@/lib/properties/property-catalog"
import type { PropertyListFilters } from "@/lib/properties/filter-property-listings"
import type { PropertyOperation, PropertyType } from "@/types/property-listing"
import { XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const PROPERTY_TYPES: (PropertyType | "all")[] = [
  "all",
  "casa",
  "departamento",
  "terreno",
  "local",
  "galpon",
  "campo",
  "ph",
  "otro",
]
const OPERATIONS: (PropertyOperation | "all")[] = ["all", "venta", "alquiler", "alquiler_temporario"]

const filterLabel = "text-sm font-semibold text-servido-800"
const filterInput =
  "border-servido-200 bg-white text-servido-900 placeholder:text-servido-500/60 focus-visible:ring-servido-600"
const filterSelectTrigger = "w-full border-servido-200 bg-white text-servido-900"

interface PropertiesFiltersPanelProps {
  filters: PropertyListFilters
  onChange: (patch: Partial<PropertyListFilters>) => void
  sortBy: string
  onSortByChange: (value: string) => void
  onClear: () => void
  resultCount?: number
  embedded?: boolean
}

export function PropertiesFiltersPanel({
  filters,
  onChange,
  sortBy,
  onSortByChange,
  onClear,
  resultCount,
  embedded = false,
}: PropertiesFiltersPanelProps) {
  const t = useTranslations("properties")

  return (
    <div
      className={cn(
        embedded
          ? "space-y-4"
          : "space-y-5 rounded-2xl border border-servido-200/90 bg-white p-5 shadow-lg shadow-servido-950/10"
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-servido-900">{t("filtersTitle")}</h2>
          {typeof resultCount === "number" && (
            <span className="rounded-full bg-servido-100 px-2.5 py-0.5 text-xs font-semibold text-servido-800">
              {t("resultsCount", { count: resultCount })}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterCurrency")}</Label>
        <div className="flex gap-2">
          {(["ARS", "USD"] as const).map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "flex-1 border-servido-300 font-semibold",
                filters.priceCurrency === c
                  ? "border-servido-800 bg-servido-800 text-white hover:bg-servido-900"
                  : "bg-white text-servido-800 hover:bg-servido-50"
              )}
              onClick={() => onChange({ priceCurrency: c })}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterOperation")}</Label>
        <Select modal={false} value={filters.operation} onValueChange={(v) => onChange({ operation: v as PropertyOperation | "all" })}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATIONS.map((op) => (
              <SelectItem key={op} value={op}>
                {op === "all" ? t("filterAll") : t(`operation.${op}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="p-search" className={filterLabel}>
          {t("filterSearch")}
        </Label>
        <Input
          id="p-search"
          className={filterInput}
          value={filters.searchTerm}
          onChange={(e) => onChange({ searchTerm: e.target.value })}
          placeholder={t("filterSearchPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterPropertyType")}</Label>
        <Select modal={false} value={filters.propertyType} onValueChange={(v) => onChange({ propertyType: v as PropertyType | "all" })}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((pt) => (
              <SelectItem key={pt} value={pt}>
                {pt === "all" ? t("filterAll") : t(`propertyType.${pt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="min-price" className={filterLabel}>
            {t("filterMinPrice")}
          </Label>
          <Input id="min-price" type="number" min={0} className={filterInput} value={filters.minPrice} onChange={(e) => onChange({ minPrice: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-price" className={filterLabel}>
            {t("filterMaxPrice")}
          </Label>
          <Input id="max-price" type="number" min={0} className={filterInput} value={filters.maxPrice} onChange={(e) => onChange({ maxPrice: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterProvince")}</Label>
        <Select modal={false} value={filters.province || "all"} onValueChange={(v) => onChange({ province: v })}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            {ARGENTINA_PROVINCES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="p-city" className={filterLabel}>
          {t("filterCity")}
        </Label>
        <Input id="p-city" className={filterInput} value={filters.city} onChange={(e) => onChange({ city: e.target.value })} placeholder={t("filterCityPlaceholder")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="min-rooms" className={filterLabel}>
            {t("filterMinRooms")}
          </Label>
          <Input id="min-rooms" type="number" min={0} className={filterInput} value={filters.minRooms} onChange={(e) => onChange({ minRooms: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-m2" className={filterLabel}>
            {t("filterMinM2")}
          </Label>
          <Input id="min-m2" type="number" min={0} className={filterInput} value={filters.minCoveredM2} onChange={(e) => onChange({ minCoveredM2: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterSort")}</Label>
        <Select modal={false} value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("sortRecent")}</SelectItem>
            <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
            <SelectItem value="m2_desc">{t("sortM2Desc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="outline" className="w-full gap-2 border-servido-300 bg-white font-semibold text-servido-800 hover:bg-servido-50" onClick={onClear}>
        <XCircle className="h-4 w-4" />
        {t("clearFilters")}
      </Button>
    </div>
  )
}
