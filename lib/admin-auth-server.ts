import { db } from "@/lib/firebase-admin"

export async function isFirestoreAdmin(uid: string): Promise<boolean> {
  const snap = await db.collection("users").doc(uid).get()
  if (!snap.exists) return false
  return snap.data()?.role === "admin"
}

/** Paths admins may delete via server API (bypasses client Storage rules). */
export const ADMIN_STORAGE_DELETE_PREFIXES = ["categories/", "brands/", "banners/"] as const

export function isAllowedAdminStoragePath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").trim()
  if (!normalized || normalized.includes("..")) return false
  return ADMIN_STORAGE_DELETE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}
