import { ProductMedia } from "@/types/product"

/**
 * Obtiene la imagen principal de un producto o servicio
 * Prioriza el array media, luego imageUrl, y finalmente un placeholder
 */
export function getProductMainImage(
  media?: ProductMedia[],
  imageUrl?: string,
  productName?: string
): string {
  if (media && media.length > 0) {
    const firstImage = media.find(m => m.type === "image")
    if (firstImage?.url) {
      return firstImage.url
    }
  }
  
  if (imageUrl) {
    return imageUrl
  }
  
 
  const query = productName ? encodeURIComponent(productName) : "product"
  return `/placeholder.svg?height=200&width=200&query=${query}`
}


export function getProductAllImages(
  media?: ProductMedia[],
  imageUrl?: string
): ProductMedia[] {
  const images: ProductMedia[] = []
  
 
  if (media && media.length > 0) {
    const imageMedia = media.filter(m => m.type === "image")
    images.push(...imageMedia)
  }
  
  
  if (images.length === 0 && imageUrl) {
    images.push({
      type: "image",
      url: imageUrl,
      path: ""
    })
  }
  
 
  if (images.length === 0) {
    images.push({
      type: "image",
      url: "/placeholder.svg?height=200&width=200&query=product",
      path: ""
    })
  }
  
  return images
}


export function getProductThumbnail(
  media?: ProductMedia[],
  imageUrl?: string,
  productName?: string
): string {
  return getProductMainImage(media, imageUrl, productName)
}


export function getCartItemImage(
  media?: ProductMedia[],
  imageUrl?: string
): string {
  return getProductMainImage(media, imageUrl, "cart item")
}


export function getSearchResultImage(
  media?: ProductMedia[],
  imageUrl?: string,
  productName?: string
): string {
  return getProductMainImage(media, imageUrl, productName)
}


export function getDashboardProductImage(
  media?: ProductMedia[],
  imageUrl?: string
): string {
  return getProductMainImage(media, imageUrl, "dashboard product")
}


export function getChatProductImage(
  media?: ProductMedia[],
  imageUrl?: string
): string {
  return getProductMainImage(media, imageUrl, "chat product")
} 