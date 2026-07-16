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

/** Cómo cobra el restaurante al cliente */
export type RestaurantPaymentMethod = "mercadopago" | "cash" | "transfer"

export type MenuOptionGroupKind = "variant" | "extra"

export interface RestaurantTransferInfo {
  alias?: string
  cbu?: string
  bankName?: string
  holderName?: string
  instructions?: string
}

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
  /** @deprecated Prefer coverImageUrl / logoUrl */
  imageUrl?: string
  coverImageUrl?: string | null
  coverImagePath?: string | null
  logoUrl?: string | null
  logoPath?: string | null
  phone?: string
  /** Precio de envío que cobra el restaurante (0 = gratis). No aplica a retiro. */
  deliveryFee?: number
  /** Métodos habilitados. Si está vacío, el checkout no puede completar. */
  paymentMethods?: RestaurantPaymentMethod[]
  transferInfo?: RestaurantTransferInfo
  /** Si el dueño tiene suscripción activa (para listados / operación pública) */
  subscriptionActive?: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MenuCategory {
  id: string
  restaurantId: string
  name: string
  sortOrder: number
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MenuItemImage {
  url: string
  path: string
}

export interface MenuOption {
  id: string
  name: string
  /** Monto que se suma al precio base del producto */
  priceDelta: number
  available: boolean
  isDefault?: boolean
  sortOrder: number
}

export interface MenuOptionGroup {
  id: string
  name: string
  kind: MenuOptionGroupKind
  required: boolean
  minSelect: number
  maxSelect: number
  sortOrder: number
  options: MenuOption[]
}

export interface MenuItem {
  id: string
  restaurantId: string
  name: string
  description?: string
  price: number
  /** @deprecated Prefer categoryId */
  category?: string
  categoryId?: string | null
  sortOrder?: number
  /** @deprecated Prefer imageUrls */
  imageUrl?: string
  imageUrls?: string[]
  imagePaths?: string[]
  optionGroups?: MenuOptionGroup[]
  available: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MenuPromotionIncludedItem {
  menuItemId: string
  name: string
  quantity: number
}

export interface MenuPromotion {
  id: string
  restaurantId: string
  name: string
  description?: string
  type: "combo"
  available: boolean
  comboPrice: number
  includedItems: MenuPromotionIncludedItem[]
  sortOrder: number
  imageUrl?: string | null
  imagePath?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export interface FoodOrderItemSelection {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDelta: number
}

export interface FoodOrderItem {
  menuItemId: string
  name: string
  /** Precio unitario final (base + opciones o precio de combo) */
  price: number
  quantity: number
  basePrice?: number
  selections?: FoodOrderItemSelection[]
  lineKey?: string
  promotionId?: string
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
  paymentMethod?: RestaurantPaymentMethod
  paymentId?: string
  preferenceId?: string
  restaurantOwnerId?: string | null
  cadeteId?: string | null
  cadeteName?: string | null
  assignedAt?: unknown
  /** Zona del restaurante (denormalizada para filtrar el pool de cadetes) */
  restaurantZone?: string | null
  /** Dirección del local (para navegación del cadete) */
  restaurantAddress?: string | null
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

export const RESTAURANT_PAYMENT_METHOD_LABELS: Record<RestaurantPaymentMethod, string> = {
  mercadopago: "Mercado Pago",
  cash: "Efectivo",
  transfer: "Transferencia",
}

export const MENU_ITEM_MAX_IMAGES = 5

export function getRestaurantLogoUrl(restaurant: Pick<Restaurant, "logoUrl" | "imageUrl">): string | null {
  return restaurant.logoUrl || restaurant.imageUrl || null
}

export function getRestaurantCoverUrl(
  restaurant: Pick<Restaurant, "coverImageUrl" | "imageUrl">
): string | null {
  return restaurant.coverImageUrl || restaurant.imageUrl || null
}

export function getMenuItemImages(item: MenuItem): string[] {
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter(Boolean)
  }
  if (item.imageUrl) return [item.imageUrl]
  return []
}

export function getMenuItemPrimaryImage(item: MenuItem): string | null {
  return getMenuItemImages(item)[0] || null
}

export function menuItemHasOptions(item: Pick<MenuItem, "optionGroups">): boolean {
  return Array.isArray(item.optionGroups) && item.optionGroups.length > 0
}

export function formatOrderItemSelections(item: FoodOrderItem): string | null {
  if (item.selections?.length) {
    return item.selections.map((s) => s.optionName).join(" · ")
  }
  return null
}
