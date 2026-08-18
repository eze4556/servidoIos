import type { VehicleCondition, VehicleListing, VehicleType } from "@/types/vehicle-listing"

export interface VehicleListFilters {
  searchTerm: string
  priceCurrency: "ARS" | "USD"
  minPrice: string
  maxPrice: string
  province: string
  city: string
  make: string
  model: string
  vehicleType: VehicleType | "all"
  condition: VehicleCondition | "all"
  maxYear: string
  minYear: string
  maxMileage: string
}

export function filterVehicleListings(
  listings: VehicleListing[],
  filters: VehicleListFilters
): VehicleListing[] {
  const minP = filters.minPrice ? Number(filters.minPrice) : null
  const maxP = filters.maxPrice ? Number(filters.maxPrice) : null
  const minY = filters.minYear ? Number(filters.minYear) : null
  const maxY = filters.maxYear ? Number(filters.maxYear) : null
  const maxKm = filters.maxMileage ? Number(filters.maxMileage) : null
  const term = filters.searchTerm.trim().toLowerCase()

  return listings.filter((v) => {
    if (v.priceCurrency !== filters.priceCurrency) return false
    if (filters.vehicleType !== "all" && v.vehicleType !== filters.vehicleType) return false
    if (filters.condition && filters.condition !== "all" && v.condition !== filters.condition) return false
    if (filters.province && filters.province !== "all" && v.province !== filters.province) return false
    if (filters.city.trim() && !v.city.toLowerCase().includes(filters.city.trim().toLowerCase())) return false
    if (filters.make && filters.make !== "all" && v.make !== filters.make) return false
    if (filters.model && filters.model !== "all" && v.model !== filters.model) return false
    if (minP != null && !Number.isNaN(minP) && v.price < minP) return false
    if (maxP != null && !Number.isNaN(maxP) && v.price > maxP) return false
    if (minY != null && !Number.isNaN(minY) && v.year < minY) return false
    if (maxY != null && !Number.isNaN(maxY) && v.year > maxY) return false
    if (maxKm != null && !Number.isNaN(maxKm) && (v.mileageKm ?? 0) > maxKm) return false
    if (term) {
      const hay = `${v.title} ${v.make} ${v.model} ${v.description} ${v.city} ${v.province}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
}

export function sortVehicleListings(
  listings: VehicleListing[],
  sortBy: "recent" | "price_asc" | "price_desc" | "year_desc"
): VehicleListing[] {
  const copy = [...listings]
  switch (sortBy) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price)
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price)
    case "year_desc":
      return copy.sort((a, b) => b.year - a.year)
    default:
      return copy
  }
}
