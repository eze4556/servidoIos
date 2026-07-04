import { isDemoMode } from "@/lib/demo/config"

export function mergeCatalog<T extends { id: string }>(firestoreItems: T[], demoItems: T[]): T[] {
  if (!isDemoMode) return firestoreItems

  const existingIds = new Set(firestoreItems.map((item) => item.id))
  const uniqueDemoItems = demoItems.filter((item) => !existingIds.has(item.id))

  return [...uniqueDemoItems, ...firestoreItems]
}
