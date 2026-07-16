import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "@/lib/firebase"

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function validateRestaurantImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return "Usá una imagen JPG, PNG, WEBP o GIF."
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen no puede superar 5 MB."
  }
  return null
}

async function safeDeletePath(path?: string | null) {
  if (!path) return
  try {
    await deleteObject(ref(storage, path))
  } catch {
    // ignore missing files
  }
}

export async function uploadRestaurantBrandingImage(
  restaurantId: string,
  kind: "cover" | "logo",
  file: File,
  previousPath?: string | null
): Promise<{ url: string; path: string }> {
  const error = validateRestaurantImageFile(file)
  if (error) throw new Error(error)

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `restaurants/${restaurantId}/branding/${kind}-${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  if (previousPath && previousPath !== path) {
    await safeDeletePath(previousPath)
  }
  return { url, path }
}

export async function uploadMenuItemImage(
  restaurantId: string,
  menuItemId: string,
  file: File,
  index: number
): Promise<{ url: string; path: string }> {
  const error = validateRestaurantImageFile(file)
  if (error) throw new Error(error)

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `restaurants/${restaurantId}/menu/${menuItemId}/${Date.now()}-${index}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function uploadMenuPromotionImage(
  restaurantId: string,
  promotionId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const error = validateRestaurantImageFile(file)
  if (error) throw new Error(error)

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `restaurants/${restaurantId}/promotions/${promotionId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteStoragePaths(paths: Array<string | null | undefined>) {
  await Promise.all(paths.map((p) => safeDeletePath(p)))
}
