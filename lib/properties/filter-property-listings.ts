import type { PropertyListing, PropertyOperation, PropertyType } from "@/types/property-listing"

export interface PropertyListFilters {
  searchTerm: string
  priceCurrency: "ARS" | "USD"
  minPrice: string
  maxPrice: string
  province: string
  city: string
  propertyType: PropertyType | "all"
  operation: PropertyOperation | "all"
  minRooms: string
  minCoveredM2: string
}

export function filterPropertyListings(
  listings: PropertyListing[],
  filters: PropertyListFilters
): PropertyListing[] {
  const minP = filters.minPrice ? Number(filters.minPrice) : null
  const maxP = filters.maxPrice ? Number(filters.maxPrice) : null
  const minRooms = filters.minRooms ? Number(filters.minRooms) : null
  const minM2 = filters.minCoveredM2 ? Number(filters.minCoveredM2) : null
  const term = filters.searchTerm.trim().toLowerCase()

  return listings.filter((p) => {
    if (p.priceCurrency !== filters.priceCurrency) return false
    if (filters.propertyType !== "all" && p.propertyType !== filters.propertyType) return false
    if (filters.operation !== "all" && p.operation !== filters.operation) return false
    if (filters.province && filters.province !== "all" && p.province !== filters.province) return false
    if (filters.city.trim() && !p.city.toLowerCase().includes(filters.city.trim().toLowerCase())) return false
    if (minP != null && !Number.isNaN(minP) && p.price < minP) return false
    if (maxP != null && !Number.isNaN(maxP) && p.price > maxP) return false
    if (minRooms != null && !Number.isNaN(minRooms) && (p.rooms ?? 0) < minRooms) return false
    if (minM2 != null && !Number.isNaN(minM2) && (p.coveredM2 ?? 0) < minM2) return false
    if (term) {
      const hay = `${p.title} ${p.description} ${p.city} ${p.neighborhood || ""}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
}

export function sortPropertyListings(
  listings: PropertyListing[],
  sortBy: "recent" | "price_asc" | "price_desc" | "m2_desc"
): PropertyListing[] {
  const copy = [...listings]
  switch (sortBy) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price)
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price)
    case "m2_desc":
      return copy.sort((a, b) => (b.coveredM2 ?? 0) - (a.coveredM2 ?? 0))
    default:
      return copy
  }
}
