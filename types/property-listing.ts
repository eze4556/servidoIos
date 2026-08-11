import type { ProductMedia } from "@/types/product"

export const PROPERTY_LISTINGS_COLLECTION = "propertyListings" as const

export const MAX_ACTIVE_PROPERTY_LISTINGS_PER_USER = 10
export const MAX_PROPERTY_IMAGES = 15
export const MAX_PROPERTY_VIDEOS = 3

export type PropertyListingStatus = "active" | "paused" | "sold" | "rented"

export type PropertyType =
  | "casa"
  | "departamento"
  | "terreno"
  | "local"
  | "galpon"
  | "campo"
  | "ph"
  | "otro"

export type PropertyOperation = "venta" | "alquiler" | "alquiler_temporario"

export type PropertyPriceCurrency = "ARS" | "USD"

export interface PropertyListing {
  id: string
  sellerId: string
  sellerDisplayName: string
  status: PropertyListingStatus
  propertyType: PropertyType
  operation: PropertyOperation
  rooms?: number | null
  bathrooms?: number | null
  coveredM2?: number | null
  totalM2?: number | null
  price: number
  priceCurrency: PropertyPriceCurrency
  expenses?: number | null
  province: string
  city: string
  neighborhood?: string | null
  locationLabel: string
  latitude?: number | null
  longitude?: number | null
  title: string
  description: string
  media: ProductMedia[]
  allowChat: boolean
  createdAt: unknown
  updatedAt?: unknown
}

export type PropertyListingInput = Omit<
  PropertyListing,
  "id" | "createdAt" | "updatedAt" | "sellerId" | "sellerDisplayName" | "status"
>
