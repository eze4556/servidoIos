import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore"
import type { MenuCategory, MenuItem } from "@/types/restaurant"
import { getMenuItemImages } from "@/types/restaurant"
import { mapOptionGroups } from "@/lib/restaurant-options"

export function sortBySortOrderThenName<T extends { sortOrder?: number; name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER
    const bo = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name, "es")
  })
}

export function groupMenuItemsByCategory(
  categories: MenuCategory[],
  items: MenuItem[]
): Array<{ category: MenuCategory | null; items: MenuItem[] }> {
  const sortedCategories = sortBySortOrderThenName(categories)
  const used = new Set<string>()
  const groups: Array<{ category: MenuCategory | null; items: MenuItem[] }> = []

  for (const category of sortedCategories) {
    const catItems = sortBySortOrderThenName(
      items.filter((item) => item.categoryId === category.id)
    )
    catItems.forEach((item) => used.add(item.id))
    groups.push({ category, items: catItems })
  }

  // Legacy items by text category name (no categoryId)
  const legacyByName = new Map<string, MenuItem[]>()
  for (const item of items) {
    if (used.has(item.id)) continue
    if (item.categoryId) continue
    const key = (item.category || "Sin categoría").trim() || "Sin categoría"
    const list = legacyByName.get(key) || []
    list.push(item)
    legacyByName.set(key, list)
  }

  for (const [name, list] of Array.from(legacyByName.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "es")
  )) {
    const existing = groups.find((g) => g.category?.name === name)
    if (existing) {
      existing.items = sortBySortOrderThenName([...existing.items, ...list])
      list.forEach((item) => used.add(item.id))
    } else {
      groups.push({
        category: {
          id: `legacy:${name}`,
          restaurantId: list[0]?.restaurantId || "",
          name,
          sortOrder: Number.MAX_SAFE_INTEGER,
        },
        items: sortBySortOrderThenName(list),
      })
      list.forEach((item) => used.add(item.id))
    }
  }

  const orphans = sortBySortOrderThenName(items.filter((item) => !used.has(item.id)))
  if (orphans.length > 0) {
    groups.push({ category: null, items: orphans })
  }

  return groups.filter((g) => g.items.length > 0 || (g.category && !g.category.id.startsWith("legacy:")))
}

/**
 * Progressive migration: create menuCategories docs from legacy text categories
 * and link menuItems via categoryId. Safe to call multiple times.
 */
export async function ensureMenuCategoriesMigrated(
  db: Firestore,
  restaurantId: string
): Promise<{ categories: MenuCategory[]; items: MenuItem[]; migrated: boolean }> {
  const [categoriesSnap, itemsSnap] = await Promise.all([
    getDocs(query(collection(db, "menuCategories"), where("restaurantId", "==", restaurantId))),
    getDocs(query(collection(db, "menuItems"), where("restaurantId", "==", restaurantId))),
  ])

  let categories: MenuCategory[] = categoriesSnap.docs.map((d) =>
    mapMenuCategoryDoc(d.id, d.data() as Record<string, unknown>)
  )
  let items: MenuItem[] = itemsSnap.docs.map((d) =>
    mapMenuItemDoc(d.id, d.data() as Record<string, unknown>)
  )

  const byName = new Map<string, MenuCategory>()
  for (const cat of categories) {
    byName.set(cat.name.trim().toLowerCase(), cat)
  }

  const needsCategoryDocs: string[] = []
  for (const item of items) {
    if (item.categoryId) continue
    const name = (item.category || "").trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!byName.has(key) && !needsCategoryDocs.includes(name)) {
      needsCategoryDocs.push(name)
    }
  }

  const needsItemLink = items.some((item) => {
    if (item.categoryId) return false
    const name = (item.category || "").trim()
    return Boolean(name)
  })

  const needsSortOrder =
    categories.some((c) => typeof c.sortOrder !== "number") ||
    items.some((i) => typeof i.sortOrder !== "number")

  if (needsCategoryDocs.length === 0 && !needsItemLink && !needsSortOrder) {
    return {
      categories: sortBySortOrderThenName(categories),
      items: sortBySortOrderThenName(items),
      migrated: false,
    }
  }

  const batch = writeBatch(db)
  let ops = 0
  const maxOrder = categories.reduce(
    (max, c) => Math.max(max, typeof c.sortOrder === "number" ? c.sortOrder : -1),
    -1
  )
  let nextCatOrder = maxOrder + 1

  for (const name of needsCategoryDocs) {
    const ref = doc(collection(db, "menuCategories"))
    const data: Omit<MenuCategory, "id"> = {
      restaurantId,
      name,
      sortOrder: nextCatOrder++,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    batch.set(ref, data)
    const created: MenuCategory = { id: ref.id, ...data }
    categories.push(created)
    byName.set(name.trim().toLowerCase(), created)
    ops++
  }

  // Fill missing sortOrder on categories
  const sortedCats = sortBySortOrderThenName(categories)
  sortedCats.forEach((cat, index) => {
    if (typeof cat.sortOrder !== "number") {
      batch.update(doc(db, "menuCategories", cat.id), {
        sortOrder: index,
        updatedAt: serverTimestamp(),
      })
      cat.sortOrder = index
      ops++
    }
  })

  // Link items + fill sortOrder within category
  const itemsByCat = new Map<string, MenuItem[]>()
  for (const item of items) {
    let categoryId = item.categoryId || null
    if (!categoryId) {
      const name = (item.category || "").trim()
      if (name) {
        categoryId = byName.get(name.toLowerCase())?.id || null
      }
    }
    const key = categoryId || "__none__"
    const list = itemsByCat.get(key) || []
    list.push(item)
    itemsByCat.set(key, list)
    if (categoryId && item.categoryId !== categoryId) {
      item.categoryId = categoryId
    }
  }

  for (const [key, list] of itemsByCat) {
    const sorted = sortBySortOrderThenName(list)
    sorted.forEach((item, index) => {
      const updates: Record<string, unknown> = {}
      if (key !== "__none__" && item.categoryId !== key) {
        updates.categoryId = key
        item.categoryId = key
      }
      if (typeof item.sortOrder !== "number") {
        updates.sortOrder = index
        item.sortOrder = index
      }
      // Keep legacy category text in sync when we have a real category
      if (key !== "__none__") {
        const cat = categories.find((c) => c.id === key)
        if (cat && item.category !== cat.name) {
          updates.category = cat.name
          item.category = cat.name
        }
      }
      // Sync primary imageUrl for older readers
      const images = getMenuItemImages(item)
      if (images[0] && item.imageUrl !== images[0]) {
        updates.imageUrl = images[0]
        item.imageUrl = images[0]
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp()
        batch.update(doc(db, "menuItems", item.id), updates)
        ops++
      }
    })
  }

  if (ops > 0) {
    await batch.commit()
  }

  return {
    categories: sortBySortOrderThenName(categories),
    items: sortBySortOrderThenName(items),
    migrated: ops > 0,
  }
}

export async function persistSortOrders(
  db: Firestore,
  collectionName: "menuCategories" | "menuItems",
  orderedIds: string[]
): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, collectionName, id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

export function mapMenuCategoryDoc(id: string, data: Record<string, unknown>): MenuCategory {
  return {
    id,
    restaurantId: String(data.restaurantId || ""),
    name: String(data.name || ""),
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function mapMenuItemDoc(id: string, data: Record<string, unknown>): MenuItem {
  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter((u): u is string => typeof u === "string" && Boolean(u))
    : undefined
  const imagePaths = Array.isArray(data.imagePaths)
    ? data.imagePaths.filter((p): p is string => typeof p === "string" && Boolean(p))
    : undefined

  return {
    id,
    restaurantId: String(data.restaurantId || ""),
    name: String(data.name || ""),
    description: typeof data.description === "string" ? data.description : undefined,
    price: Number(data.price) || 0,
    category: typeof data.category === "string" ? data.category : undefined,
    categoryId: typeof data.categoryId === "string" ? data.categoryId : data.categoryId === null ? null : undefined,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    imageUrls,
    imagePaths,
    optionGroups: mapOptionGroups(data.optionGroups),
    available: data.available !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}
