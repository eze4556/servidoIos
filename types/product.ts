export interface ProductMedia {
  type: "image" | "video"
  url: string
  path: string
  thumbnail?: string 
}

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
  createdAt: any
  updatedAt?: any
}
