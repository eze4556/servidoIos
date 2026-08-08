import { auth } from "@/lib/firebase"

/** Imagen de producto vía API (sin CORS de Firebase Storage en el cliente). */
export async function fetchProductImageFile(productId: string, filename?: string): Promise<File> {
  const user = auth.currentUser
  if (!user) {
    throw new Error("not_authenticated")
  }
  const token = await user.getIdToken()
  const res = await fetch(`/api/reseller/product-image?productId=${encodeURIComponent(productId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`product_image_failed:${res.status}`)
  }
  const blob = await res.blob()
  const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg"
  return new File([blob], filename || `${productId}.jpg`, { type })
}
