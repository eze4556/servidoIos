import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "@/lib/firebase"

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/jfif", "image/png", "image/webp", "image/gif"]
const IMAGE_EXT = new Set(["jpg", "jpeg", "jfif", "png", "webp", "gif"])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export function validateVehicleImageFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const typeOk = IMAGE_TYPES.includes(file.type) || (file.type === "" && IMAGE_EXT.has(ext))
  if (!typeOk) return "invalid_type"
  if (file.size > MAX_IMAGE_BYTES) return "too_large"
  return null
}

export async function uploadVehicleListingImage(
  sellerId: string,
  listingId: string,
  file: File,
  index: number
): Promise<{ url: string; path: string }> {
  const err = validateVehicleImageFile(file)
  if (err) throw new Error(`vehicle_image:${err}`)

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `vehicles/${sellerId}/${listingId}/${Date.now()}-${index}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteVehicleStoragePath(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path))
  } catch {
    // ignore missing
  }
}
