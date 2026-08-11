import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "@/lib/firebase"

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/jfif", "image/png", "image/webp", "image/gif"]
const IMAGE_EXT = new Set(["jpg", "jpeg", "jfif", "png", "webp", "gif"])
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const VIDEO_EXT = new Set(["mp4", "webm", "mov"])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 80 * 1024 * 1024

export function validatePropertyImageFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const typeOk = IMAGE_TYPES.includes(file.type) || (file.type === "" && IMAGE_EXT.has(ext))
  if (!typeOk) return "invalid_type"
  if (file.size > MAX_IMAGE_BYTES) return "too_large"
  return null
}

export function validatePropertyVideoFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const typeOk = VIDEO_TYPES.includes(file.type) || (file.type === "" && VIDEO_EXT.has(ext))
  if (!typeOk) return "invalid_type"
  if (file.size > MAX_VIDEO_BYTES) return "too_large"
  return null
}

export async function uploadPropertyListingImage(
  sellerId: string,
  listingId: string,
  file: File,
  index: number
): Promise<{ url: string; path: string }> {
  const err = validatePropertyImageFile(file)
  if (err) throw new Error(`property_image:${err}`)

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `properties/${sellerId}/${listingId}/img-${Date.now()}-${index}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function uploadPropertyListingVideo(
  sellerId: string,
  listingId: string,
  file: File,
  index: number
): Promise<{ url: string; path: string }> {
  const err = validatePropertyVideoFile(file)
  if (err) throw new Error(`property_video:${err}`)

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4"
  const path = `properties/${sellerId}/${listingId}/vid-${Date.now()}-${index}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deletePropertyStoragePath(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path))
  } catch {
    // ignore
  }
}
