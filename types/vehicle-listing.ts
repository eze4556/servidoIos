import type { ProductMedia } from "@/types/product"

export const VEHICLE_LISTINGS_COLLECTION = "vehicleListings" as const

export const MAX_ACTIVE_VEHICLE_LISTINGS_PER_USER = 10

export type VehicleListingStatus = "active" | "paused" | "sold"

export type VehicleType =
  | "auto"
  | "moto"
  | "suv_pickup"
  | "utilitario"
  | "camion"
  | "otro"

export type VehicleCondition = "0km" | "usado"

export type VehiclePriceCurrency = "ARS" | "USD"

export type VehicleFuelType =
  | "nafta"
  | "diesel"
  | "gnc"
  | "electrico"
  | "hibrido"
  | "otro"

export type VehicleTransmission = "manual" | "automatica" | "otro"

export interface VehicleListing {
  id: string
  sellerId: string
  sellerDisplayName: string
  status: VehicleListingStatus
  vehicleType: VehicleType
  make: string
  model: string
  trim?: string | null
  year: number
  condition: VehicleCondition
  mileageKm?: number | null
  fuelType?: VehicleFuelType | null
  transmission?: VehicleTransmission | null
  bodyType?: string | null
  doors?: number | null
  color?: string | null
  engine?: string | null
  price: number
  priceCurrency: VehiclePriceCurrency
  province: string
  city: string
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

export type VehicleListingInput = Omit<
  VehicleListing,
  "id" | "createdAt" | "updatedAt" | "sellerId" | "sellerDisplayName" | "status"
>
