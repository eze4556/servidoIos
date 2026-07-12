export type DeliveryMode = "delivery_propio" | "retiro_en_local" | "ambos"

export type RestaurantStatus = "pending" | "approved" | "active" | "inactive"

export type FoodOrderStatus =
  | "recibido"
  | "en_preparacion"
  | "listo"
  | "en_camino"
  | "entregado"
  | "cancelado"

export type FoodPaymentStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface Restaurant {
  id: string
  ownerId: string
  name: string
  description?: string
  address: string
  zone?: string
  city?: string | null
  locationLabel?: string
  coordinates?: { latitude: number; longitude: number } | null
  deliveryMode: DeliveryMode
  status: RestaurantStatus
  imageUrl?: string
  phone?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MenuItem {
  id: string
  restaurantId: string
  name: string
  description?: string
  price: number
  category?: string
  imageUrl?: string
  available: boolean
  createdAt?: unknown
}

export interface FoodOrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}

export interface FoodOrder {
  id: string
  buyerId: string
  buyerEmail: string
  restaurantId: string
  restaurantName: string
  items: FoodOrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  deliveryMode: DeliveryMode
  address?: string
  phone?: string
  notes?: string
  status: FoodOrderStatus
  paymentStatus: FoodPaymentStatus
  paymentId?: string
  preferenceId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export const FOOD_ORDER_STATUS_LABELS: Record<FoodOrderStatus, string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo para retirar",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  delivery_propio: "Delivery propio",
  retiro_en_local: "Retiro en local",
  ambos: "Delivery y retiro",
}
