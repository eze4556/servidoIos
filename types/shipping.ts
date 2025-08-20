// Tipos para el sistema de gestión de envíos

export interface ShippingAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
  recipientName?: string
  additionalInfo?: string
}

export type ShippingStatus = 
  | "pending"      
  | "preparing"    
  | "shipped"      
  | "delivered"    
  | "cancelled"    

export interface ShippingInfo {
  status: ShippingStatus
  address?: ShippingAddress
  trackingNumber?: string
  carrierName?: string
  estimatedDelivery?: Date
  actualDelivery?: Date
  notes?: string
  updatedAt: Date
  updatedBy: string 
}


export interface PurchaseWithShipping {
  id: string
  paymentId: string
  productId: string
  sellerId: string
  buyerId: string
  amount: number
  status: "approved" | "pending" | "rejected" | "cancelled"
  type: string
  createdAt: any
  
 
  shipping?: ShippingInfo
  
 
  productName?: string
  productImage?: string
  productIsService?: boolean
  
  
  sellerName?: string
  sellerEmail?: string
  
 
  buyerName?: string
  buyerEmail?: string
}


export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pending: "Pendiente",
  preparing: "En preparación", 
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado"
}


export const SHIPPING_STATUS_COLORS: Record<ShippingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800", 
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

export const SHIPPING_STATUS_ICONS: Record<ShippingStatus, string> = {
  pending: "Clock",
  preparing: "Package",
  shipped: "Truck", 
  delivered: "CheckCircle",
  cancelled: "XCircle"
}

export interface ShippingUpdateRequest {
  purchaseId: string
  status: ShippingStatus
  trackingNumber?: string
  carrierName?: string
  estimatedDelivery?: Date
  notes?: string
} 