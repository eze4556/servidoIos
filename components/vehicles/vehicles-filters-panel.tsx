"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { ARGENTINA_PROVINCES, VEHICLE_MAKES, modelsForMake } from "@/lib/vehicles/vehicle-catalog"
import type { VehicleListFilters } from "@/lib/vehicles/filter-vehicle-listings"
import type { VehicleCondition, VehicleType } from "@/types/vehicle-listing"
import { XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const VEHICLE_TYPES: (VehicleType | "all")[] = [
  "all",
  "auto",
  "suv_pickup",
  "moto",
  "utilitario",
  "camion",
  "otro",
]

const filterLabel = "text-sm font-semibold text-servido-800"
const filterInput =
  "border-servido-200 bg-white text-servido-900 placeholder:text-servido-500/60 focus-visible:ring-servido-600"
const filterSelectTrigger = "w-full border-servido-200 bg-white text-servido-900 focus:ring-servido-600"

interface VehiclesFiltersPanelProps {
  filters: VehicleListFilters
  onChange: (patch: Partial<VehicleListFilters>) => void
  sortBy: string
  onSortByChange: (value: string) => void
  onClear: () => void
  resultCount?: number
  /** Sin caja exterior (p. ej. sheet móvil) */
  embedded?: boolean
}

export function VehiclesFiltersPanel({
  filters,
  onChange,
  sortBy,
  onSortByChange,
  onClear,
  resultCount,
  embedded = false,
}: VehiclesFiltersPanelProps) {
  const t = useTranslations("vehicles")
  const models = useMemo(
    () => (filters.make && filters.make !== "all" ? modelsForMake(filters.make) : []),
    [filters.make]
  )

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
                  ? "border-servido-800 bg-servido-800 text-white hover:bg-servido-900 hover:text-white"
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
        <Label htmlFor="v-search" className={filterLabel}>
          {t("filterSearch")}
        </Label>
        <Input
          id="v-search"
          className={filterInput}
          value={filters.searchTerm}
          onChange={(e) => onChange({ searchTerm: e.target.value })}
          placeholder={t("filterSearchPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterVehicleType")}</Label>
        <Select modal={false} value={filters.vehicleType} onValueChange={(v) => onChange({ vehicleType: v as VehicleType | "all" })}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map((vt) => (
              <SelectItem key={vt} value={vt}>
                {vt === "all" ? t("filterAll") : t(`vehicleType.${vt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterCondition")}</Label>
        <Select
          modal={false}
          value={filters.condition || "all"}
          onValueChange={(v) => onChange({ condition: v as VehicleCondition | "all" })}
        >
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="0km">{t("condition.0km")}</SelectItem>
            <SelectItem value="usado">{t("condition.usado")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="min-price" className={filterLabel}>
            {t("filterMinPrice")}
          </Label>
          <Input
            id="min-price"
            type="number"
            min={0}
            className={filterInput}
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-price" className={filterLabel}>
            {t("filterMaxPrice")}
          </Label>
          <Input
            id="max-price"
            type="number"
            min={0}
            className={filterInput}
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: e.target.value })}
          />
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
        <Label htmlFor="v-city" className={filterLabel}>
          {t("filterCity")}
        </Label>
        <Input
          id="v-city"
          className={filterInput}
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder={t("filterCityPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label className={filterLabel}>{t("filterMake")}</Label>
        <Select
          modal={false}
          value={filters.make || "all"}
          onValueChange={(v) => onChange({ make: v, model: "all" })}
        >
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            {VEHICLE_MAKES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.make && filters.make !== "all" && (
        <div className="space-y-2">
          <Label className={filterLabel}>{t("filterModel")}</Label>
          <Select modal={false} value={filters.model || "all"} onValueChange={(v) => onChange({ model: v })}>
            <SelectTrigger className={filterSelectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="min-year" className={filterLabel}>
            {t("filterMinYear")}
          </Label>
          <Input
            id="min-year"
            type="number"
            className={filterInput}
            value={filters.minYear}
            onChange={(e) => onChange({ minYear: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-year" className={filterLabel}>
            {t("filterMaxYear")}
          </Label>
          <Input
            id="max-year"
            type="number"
            className={filterInput}
            value={filters.maxYear}
            onChange={(e) => onChange({ maxYear: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-km" className={filterLabel}>
          {t("filterMaxMileage")}
        </Label>
        <Input
          id="max-km"
          type="number"
          min={0}
          className={filterInput}
          value={filters.maxMileage}
          onChange={(e) => onChange({ maxMileage: e.target.value })}
        />
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
            <SelectItem value="year_desc">{t("sortYearDesc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-servido-300 bg-white font-semibold text-servido-800 hover:bg-servido-50"
        onClick={onClear}
      >
        <XCircle className="h-4 w-4" />
        {t("clearFilters")}
      </Button>
    </div>
  )
}
