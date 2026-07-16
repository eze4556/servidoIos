"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { db } from "@/lib/firebase"
import {
  ensureMenuCategoriesMigrated,
  persistSortOrders,
  sortBySortOrderThenName,
} from "@/lib/restaurant-menu"
import { deleteStoragePaths } from "@/lib/restaurant-storage"
import type { MenuCategory, MenuItem } from "@/types/restaurant"
import { getMenuItemPrimaryImage, menuItemHasOptions } from "@/types/restaurant"
import { formatPriceNumber, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MenuProductForm } from "./menu-product-form"
import { MenuCombosAdmin } from "./menu-combos-admin"
import { SortableList } from "./sortable-list"

type AdminMenuTab = "categories" | "combos"

interface MenuAdminPanelProps {
  restaurantId: string
  enabled: boolean
  onNeedSubscription: () => void
}

export function MenuAdminPanel({ restaurantId, enabled, onNeedSubscription }: MenuAdminPanelProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [savingCategory, setSavingCategory] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<MenuCategory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adminTab, setAdminTab] = useState<AdminMenuTab>("categories")

  const load = async () => {
    setLoading(true)
    try {
      const result = await ensureMenuCategoriesMigrated(db, restaurantId)
      setCategories(result.categories)
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el menú")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [restaurantId])

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null
  const categoryItems = useMemo(() => {
    if (!selectedCategoryId) return []
    return sortBySortOrderThenName(items.filter((item) => item.categoryId === selectedCategoryId))
  }, [items, selectedCategoryId])

  const requireEnabled = () => {
    if (!enabled) {
      onNeedSubscription()
      return false
    }
    return true
  }

  const handleCreateCategory = async () => {
    if (!requireEnabled()) return
    const name = newCategoryName.trim()
    if (!name) return
    setSavingCategory(true)
    setError(null)
    try {
      const sortOrder = categories.length
      const ref = await addDoc(collection(db, "menuCategories"), {
        restaurantId,
        name,
        sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const created: MenuCategory = { id: ref.id, restaurantId, name, sortOrder }
      setCategories((prev) => sortBySortOrderThenName([...prev, created]))
      setNewCategoryName("")
      setSelectedCategoryId(ref.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoría")
    } finally {
      setSavingCategory(false)
    }
  }

  const handleRenameCategory = async (category: MenuCategory) => {
    if (!requireEnabled()) return
    const name = renameValue.trim()
    if (!name || name === category.name) {
      setRenamingId(null)
      return
    }
    try {
      await updateDoc(doc(db, "menuCategories", category.id), {
        name,
        updatedAt: serverTimestamp(),
      })
      const batch = writeBatch(db)
      const linked = items.filter((item) => item.categoryId === category.id)
      linked.forEach((item) => {
        batch.update(doc(db, "menuItems", item.id), {
          category: name,
          updatedAt: serverTimestamp(),
        })
      })
      if (linked.length) await batch.commit()
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, name } : c)))
      setItems((prev) =>
        prev.map((item) => (item.categoryId === category.id ? { ...item, category: name } : item))
      )
      setRenamingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renombrar")
    }
  }

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget || !requireEnabled()) return
    const category = deleteCategoryTarget
    const linked = items.filter((item) => item.categoryId === category.id)
    try {
      for (const item of linked) {
        await deleteStoragePaths(item.imagePaths || [])
        await deleteDoc(doc(db, "menuItems", item.id))
      }
      await deleteDoc(doc(db, "menuCategories", category.id))
      setItems((prev) => prev.filter((item) => item.categoryId !== category.id))
      setCategories((prev) => prev.filter((c) => c.id !== category.id))
      if (selectedCategoryId === category.id) setSelectedCategoryId(null)
      setDeleteCategoryTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la categoría")
    }
  }

  const reorderCategories = async (next: MenuCategory[]) => {
    if (!requireEnabled()) return
    const previous = categories
    setCategories(next.map((c, index) => ({ ...c, sortOrder: index })))
    try {
      await persistSortOrders(
        db,
        "menuCategories",
        next.map((c) => c.id)
      )
    } catch {
      setCategories(previous)
      setError("No se pudo guardar el orden de categorías")
    }
  }

  const reorderProducts = async (next: MenuItem[]) => {
    if (!requireEnabled() || !selectedCategoryId) return
    const previous = items
    setItems((prev) => {
      const others = prev.filter((item) => item.categoryId !== selectedCategoryId)
      const ordered = next.map((item, index) => ({ ...item, sortOrder: index }))
      return [...others, ...ordered]
    })
    try {
      await persistSortOrders(
        db,
        "menuItems",
        next.map((item) => item.id)
      )
    } catch {
      setItems(previous)
      setError("No se pudo guardar el orden de productos")
    }
  }

  const toggleItem = async (item: MenuItem) => {
    if (!requireEnabled()) return
    await updateDoc(doc(db, "menuItems", item.id), {
      available: !item.available,
      updatedAt: serverTimestamp(),
    })
    setItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m))
    )
  }

  const deleteItem = async (item: MenuItem) => {
    if (!requireEnabled()) return
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return
    await deleteStoragePaths(item.imagePaths || [])
    await deleteDoc(doc(db, "menuItems", item.id))
    setItems((prev) => prev.filter((m) => m.id !== item.id))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-servido-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2 rounded-2xl bg-white p-2 ring-1 ring-gray-100">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-sm font-medium",
            adminTab === "categories" ? "bg-servido-800 text-white" : "text-gray-600 hover:bg-gray-50"
          )}
          onClick={() => {
            setAdminTab("categories")
            setSelectedCategoryId(null)
          }}
        >
          Categorías
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-sm font-medium",
            adminTab === "combos" ? "bg-servido-800 text-white" : "text-gray-600 hover:bg-gray-50"
          )}
          onClick={() => setAdminTab("combos")}
        >
          Combos
        </button>
      </div>

      {adminTab === "combos" ? (
        <MenuCombosAdmin
          restaurantId={restaurantId}
          menuItems={items}
          enabled={enabled}
          onNeedSubscription={onNeedSubscription}
        />
      ) : !selectedCategory ? (
        <>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
            <h2 className="mb-1 font-semibold text-gray-900">Categorías del menú</h2>
            <p className="mb-4 text-sm text-gray-500">
              Primero creá categorías y después agregá productos dentro de cada una.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-1">
                <Label className="sr-only">Nueva categoría</Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej: Entradas, Pizzas, Bebidas"
                  className="rounded-xl"
                  disabled={!enabled}
                />
              </div>
              <Button
                className="rounded-full bg-servido-800"
                disabled={savingCategory || !newCategoryName.trim() || !enabled}
                onClick={() => void handleCreateCategory()}
              >
                {savingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Crear categoría
              </Button>
            </div>
          </div>

          {categories.length === 0 ? (
            <p className="text-center text-gray-500">Todavía no tenés categorías.</p>
          ) : (
            <SortableList
              items={categories}
              onReorder={(next) => void reorderCategories(next)}
              disabled={!enabled}
              className="space-y-3"
              renderItem={(category, handle) => {
                const count = items.filter((item) => item.categoryId === category.id).length
                return (
                  <div className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gray-100">
                    {handle as ReactNode}
                    <div className="min-w-0 flex-1">
                      {renamingId === category.id ? (
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => void handleRenameCategory(category)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleRenameCategory(category)
                            if (e.key === "Escape") setRenamingId(null)
                          }}
                          className="rounded-xl"
                        />
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setSelectedCategoryId(category.id)}
                        >
                          <p className="font-medium text-gray-900">{category.name}</p>
                          <p className="text-xs text-gray-500">
                            {count} producto{count === 1 ? "" : "s"}
                          </p>
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setRenamingId(category.id)
                        setRenameValue(category.name)
                      }}
                      disabled={!enabled}
                      aria-label="Renombrar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteCategoryTarget(category)}
                      disabled={!enabled}
                      aria-label="Eliminar categoría"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                      onClick={() => setSelectedCategoryId(category.id)}
                      aria-label="Abrir categoría"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )
              }}
            />
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedCategoryId(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Categorías
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">{selectedCategory.name}</h2>
              <p className="text-sm text-gray-500">
                {categoryItems.length} producto{categoryItems.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              className="rounded-full bg-servido-800"
              disabled={!enabled}
              onClick={() => {
                if (!requireEnabled()) return
                setEditingItem(null)
                setProductFormOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar producto
            </Button>
          </div>

          {categoryItems.length === 0 ? (
            <p className="text-center text-gray-500">Esta categoría está vacía.</p>
          ) : (
            <SortableList
              items={categoryItems}
              onReorder={(next) => void reorderProducts(next)}
              disabled={!enabled}
              className="space-y-3"
              renderItem={(item, handle) => {
                const image = getMenuItemPrimaryImage(item)
                return (
                  <div className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gray-100">
                    {handle as ReactNode}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {image ? (
                        <Image src={image} alt={item.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {menuItemHasOptions(item) && (
                          <Badge variant="secondary" className="text-[10px]">
                            Con opciones
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">${formatPriceNumber(item.price)}</p>
                    </div>
                    <Switch
                      checked={item.available}
                      onCheckedChange={() => void toggleItem(item)}
                      disabled={!enabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!enabled}
                      onClick={() => {
                        setEditingItem(item)
                        setProductFormOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!enabled}
                      onClick={() => void deleteItem(item)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )
              }}
            />
          )}
        </>
      )}

      {adminTab === "categories" && (
        <>
          <MenuProductForm
            open={productFormOpen}
            onOpenChange={setProductFormOpen}
            restaurantId={restaurantId}
            categories={categories}
            initialCategoryId={selectedCategoryId || categories[0]?.id || ""}
            item={editingItem}
            nextSortOrder={categoryItems.length}
            onSaved={(saved) => {
              setItems((prev) => {
                const exists = prev.some((m) => m.id === saved.id)
                if (exists) return prev.map((m) => (m.id === saved.id ? saved : m))
                return [...prev, saved]
              })
            }}
          />

          <AlertDialog
            open={Boolean(deleteCategoryTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteCategoryTarget(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteCategoryTarget
                    ? items.some((item) => item.categoryId === deleteCategoryTarget.id)
                      ? `La categoría "${deleteCategoryTarget.name}" tiene productos. Se eliminarán también esos productos y sus fotos.`
                      : `Se eliminará la categoría "${deleteCategoryTarget.name}".`
                    : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => void confirmDeleteCategory()}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
