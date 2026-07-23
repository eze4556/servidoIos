export interface ProductMedia {
  type: "image" | "video"
  url: string
  path: string
  thumbnail?: string 
}

import type { ServiceSchedule } from "@/types/service-appointments"

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  media: ProductMedia[] 
  isService: boolean
  stock?: number
  sellerId: string
  /** Horarios de turnos (solo servicios) */
  serviceSchedule?: ServiceSchedule | null
  createdAt: any
  updatedAt?: any
}
