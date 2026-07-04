"use client"

import { useMemo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  DollarSign,
  Loader2,
  Package,
  Search,
  Sparkles,
  Tag,
  Wrench,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

export type ProductsSortBy =
  | "createdAt_desc"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"

interface ProductsFiltersPanelProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  debouncedSearchTerm: string
  selectedCategory: string
  onCategoryChange: (value: string) => void
  selectedBrand: string
  onBrandChange: (value: string) => void
  minPrice: string
  onMinPriceChange: (value: string) => void
  maxPrice: string
  onMaxPriceChange: (value: string) => void
  isServiceFilter: boolean | "all"
  onServiceFilterChange: (value: boolean | "all") => void
  sortBy: ProductsSortBy
  onSortByChange: (value: ProductsSortBy) => void
  categories: Category[]
  brands: Brand[]
  onClearFilters: () => void
  showSort?: boolean
  resultCount?: number
}

const PRICE_PRESETS = [
  { label: "Hasta $10.000", min: "", max: "10000" },
  { label: "$10k – $50k", min: "10000", max: "50000" },
  { label: "$50k – $200k", min: "50000", max: "200000" },
  { label: "+ $200.000", min: "200000", max: "" },
] as const

const SORT_OPTIONS: { value: ProductsSortBy; label: string; icon: typeof Clock }[] = [
  { value: "createdAt_desc", label: "Recientes", icon: Clock },
  { value: "price_asc", label: "Menor precio", icon: DollarSign },
  { value: "price_desc", label: "Mayor precio", icon: DollarSign },
  { value: "name_asc", label: "A → Z", icon: ArrowDownAZ },
  { value: "name_desc", label: "Z → A", icon: ArrowUpAZ },
]

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
        selected
          ? "bg-purple-700 text-white shadow-md shadow-purple-200"
          : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-purple-300 hover:text-purple-800"
      )}
    >
      {label}
    </button>
  )
}

function FilterSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Tag
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-gray-50/80 p-4 ring-1 ring-gray-100">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

export function ProductsFiltersPanel({
  searchTerm,
  onSearchTermChange,
  debouncedSearchTerm,
  selectedCategory,
  onCategoryChange,
  selectedBrand,
  onBrandChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  isServiceFilter,
  onServiceFilterChange,
  sortBy,
  onSortByChange,
  categories,
  brands,
  onClearFilters,
  showSort = true,
  resultCount,
}: ProductsFiltersPanelProps) {
  const activeCount = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (selectedCategory && selectedCategory !== "all") count++
    if (selectedBrand && selectedBrand !== "all") count++
    if (minPrice) count++
    if (maxPrice) count++
    if (isServiceFilter !== "all") count++
    return count
  }, [searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, isServiceFilter])

  const categoryValue = selectedCategory || "all"
  const brandValue = selectedBrand || "all"

  const applyPricePreset = (min: string, max: string) => {
    const isSame = minPrice === min && maxPrice === max
    if (isSame) {
      onMinPriceChange("")
      onMaxPriceChange("")
      return
    }
    onMinPriceChange(min)
    onMaxPriceChange(max)
  }

  const isPresetActive = (min: string, max: string) => minPrice === min && maxPrice === max

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="rounded-full border-0 bg-white py-2.5 pl-10 pr-10 shadow-sm ring-1 ring-gray-200 focus-visible:ring-2 focus-visible:ring-purple-300"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchTermChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
        {searchTerm !== debouncedSearchTerm && (
          <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-purple-600" />
        )}
      </div>

      {/* Tipo — segmented control */}
      <FilterSection title="Tipo" icon={Package}>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-1 ring-1 ring-gray-200">
          {[
            { label: "Todos", value: "all" as const, icon: Sparkles },
            { label: "Productos", value: false as const, icon: Package },
            { label: "Servicios", value: true as const, icon: Wrench },
          ].map(({ label, value, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => onServiceFilterChange(value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all",
                isServiceFilter === value
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-gray-500 hover:bg-purple-50 hover:text-purple-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Categorías */}
      {categories.length > 0 && (
        <FilterSection title="Categoría" icon={Tag}>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
            <FilterChip
              label="Todas"
              selected={categoryValue === "all"}
              onClick={() => onCategoryChange("all")}
            />
            {categories.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.name}
                selected={categoryValue === cat.id}
                onClick={() => onCategoryChange(cat.id)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Marcas */}
      {brands.length > 0 && (
        <FilterSection title="Marca" icon={Sparkles}>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
            <FilterChip
              label="Todas"
              selected={brandValue === "all"}
              onClick={() => onBrandChange("all")}
            />
            {brands.map((brand) => (
              <FilterChip
                key={brand.id}
                label={brand.name}
                selected={brandValue === brand.id}
                onClick={() => onBrandChange(brand.id)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Precio */}
      <FilterSection title="Precio" icon={DollarSign}>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => (
            <FilterChip
              key={preset.label}
              label={preset.label}
              selected={isPresetActive(preset.min, preset.max)}
              onClick={() => applyPricePreset(preset.min, preset.max)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
            <Input
              type="number"
              placeholder="Mín."
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="rounded-xl border-0 bg-white pl-7 ring-1 ring-gray-200"
            />
          </div>
          <span className="text-gray-300">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
            <Input
              type="number"
              placeholder="Máx."
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="rounded-xl border-0 bg-white pl-7 ring-1 ring-gray-200"
            />
          </div>
        </div>
      </FilterSection>

      {/* Ordenar */}
      {showSort && (
        <FilterSection title="Ordenar por" icon={Clock}>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSortByChange(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  sortBy === value
                    ? "bg-purple-700 text-white shadow-md shadow-purple-200"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-purple-300"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Footer acciones */}
      <div className="space-y-2 pt-1">
        {activeCount > 0 && (
          <Button
            variant="outline"
            className="w-full rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={onClearFilters}
          >
            Limpiar {activeCount} filtro{activeCount !== 1 ? "s" : ""}
          </Button>
        )}
        {typeof resultCount === "number" && (
          <p className="text-center text-xs text-gray-400">
            {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
          </p>
        )}
      </div>
    </div>
  )
}

export function ProductsFiltersPanelHeader({ activeCount }: { activeCount: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-700 text-white shadow-md">
          <Tag className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-purple-900">Filtros</h2>
          <p className="text-xs text-gray-500">Refiná tu búsqueda</p>
        </div>
      </div>
      {activeCount > 0 && (
        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">
          {activeCount} activo{activeCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  )
}
