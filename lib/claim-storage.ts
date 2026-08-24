import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "@/lib/firebase"
import type { ClaimAttachment } from "@/types/claims"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_FILES = 8

export type ClaimFileValidationCode = "invalid_type" | "too_large" | "too_many"

export function validateClaimFiles(files: File[]): ClaimFileValidationCode | null {
  if (files.length > MAX_FILES) return "too_many"
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) return "invalid_type"
    if (file.size > MAX_FILE_BYTES) return "too_large"
  }
  return null
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "archivo"
}

export async function uploadClaimAttachments(claimId: string, files: File[]): Promise<ClaimAttachment[]> {
  const error = validateClaimFiles(files)
  if (error) throw new Error(`claim_file:${error}`)

  const uploaded: ClaimAttachment[] = []
  for (const [index, file] of files.entries()) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
    const path = `claims/${claimId}/${Date.now()}-${index}-${safeFileName(file.name.replace(/\.[^.]+$/, ""))}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    uploaded.push({
      url,
      path,
      name: file.name,
      contentType: file.type,
      size: file.size,
    })
  }
  return uploaded
}
