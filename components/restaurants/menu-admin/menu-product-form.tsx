"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { ImagePlus, Loader2, X } from "lucide-react"
import { db } from "@/lib/firebase"
import { deleteStoragePaths, uploadMenuItemImage, validateRestaurantImageFile } from "@/lib/restaurant-storage"
import type { MenuCategory, MenuItem, MenuOptionGroup } from "@/types/restaurant"
import { MENU_ITEM_MAX_IMAGES, getMenuItemImages } from "@/types/restaurant"
import { sanitizeOptionGroupsForSave, sortOptionGroups } from "@/lib/restaurant-options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HorizontalSortableList } from "./sortable-list"
import { MenuOptionGroupsEditor } from "./menu-option-groups-editor"

type DraftImage =
  | { id: string; kind: "existing"; url: string; path: string }
  | { id: string; kind: "new"; url: string; file: File }

interface MenuProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  categories: MenuCategory[]
  initialCategoryId: string
  item?: MenuItem | null
  nextSortOrder: number
  onSaved: (item: MenuItem) => void
}

export function MenuProductForm({
  open,
  onOpenChange,
  restaurantId,
  categories,
  initialCategoryId,
  item,
  nextSortOrder,
  onSaved,
}: MenuProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [available, setAvailable] = useState(true)
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [images, setImages] = useState<DraftImage[]>([])
  const [optionGroups, setOptionGroups] = useState<MenuOptionGroup[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(item?.name || "")
    setDescription(item?.description || "")
    setPrice(item ? String(item.price) : "")
    setAvailable(item?.available !== false)
    setCategoryId(item?.categoryId || initialCategoryId)
    setOptionGroups(sortOptionGroups(item?.optionGroups))
    const existingUrls = item ? getMenuItemImages(item) : []
    const existingPaths = item?.imagePaths || []
    setImages(
      existingUrls.map((url, index) => ({
        id: `existing-${index}-${url}`,
        kind: "existing" as const,
        url,
        path: existingPaths[index] || "",
      }))
    )
    setError(null)
  }, [open, item, initialCategoryId])

  const categoryName = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name || item?.category || "General",
    [categories, categoryId, item?.category]
  )

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const remaining = MENU_ITEM_MAX_IMAGES - images.length
    if (remaining <= 0) {
      setError(`Máximo ${MENU_ITEM_MAX_IMAGES} fotos por producto.`)
      return
    }
    const next: DraftImage[] = []
    for (const file of Array.from(files).slice(0, remaining)) {
      const validation = validateRestaurantImageFile(file)
      if (validation) {
        setError(validation)
        continue
      }
      next.push({
        id: `new-${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        kind: "new",
        url: URL.createObjectURL(file),
        file,
      })
    }
    if (next.length) {
      setImages((prev) => [...prev, ...next])
      setError(null)
    }
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target?.kind === "new") URL.revokeObjectURL(target.url)
      return prev.filter((img) => img.id !== id)
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Ingresá el nombre del producto.")
      return
    }
    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Ingresá un precio válido.")
      return
    }
    if (!categoryId) {
      setError("Elegí una categoría.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const menuItemId = item?.id || doc(collection(db, "menuItems")).id
      const uploadedUrls: string[] = []
      const uploadedPaths: string[] = []
      const removedPaths: string[] = []

      const previousPaths = new Set(item?.imagePaths || [])
      for (const [index, image] of images.entries()) {
        if (image.kind === "existing") {
          uploadedUrls.push(image.url)
          uploadedPaths.push(image.path)
          previousPaths.delete(image.path)
        } else {
          const uploaded = await uploadMenuItemImage(restaurantId, menuItemId, image.file, index)
          uploadedUrls.push(uploaded.url)
          uploadedPaths.push(uploaded.path)
        }
      }
      removedPaths.push(...Array.from(previousPaths).filter(Boolean))

      const cleanedGroups = sanitizeOptionGroupsForSave(optionGroups)

      const payload = {
        restaurantId,
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        categoryId,
        category: categoryName,
        sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : nextSortOrder,
        available,
        imageUrls: uploadedUrls,
        imagePaths: uploadedPaths,
        imageUrl: uploadedUrls[0] || null,
        optionGroups: cleanedGroups,
        updatedAt: serverTimestamp(),
      }

      if (item) {
        await updateDoc(doc(db, "menuItems", menuItemId), payload)
      } else {
        await setDoc(doc(db, "menuItems", menuItemId), {
          ...payload,
          createdAt: serverTimestamp(),
        })
      }

      if (removedPaths.length) {
        await deleteStoragePaths(removedPaths)
      }

      onSaved({
        id: menuItemId,
        restaurantId,
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        categoryId,
        category: categoryName,
        sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : nextSortOrder,
        available,
        imageUrls: uploadedUrls,
        imagePaths: uploadedPaths,
        imageUrl: uploadedUrls[0],
        optionGroups: cleanedGroups,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{item ? "Editar producto" : "Agregar producto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="space-y-2">
            <Label>Fotos (hasta {MENU_ITEM_MAX_IMAGES})</Label>
            <HorizontalSortableList
              items={images}
              onReorder={setImages}
              renderItem={(image, handle) => (
                <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                  <Image src={image.url} alt="" fill className="object-cover" unoptimized />
                  <div className="absolute left-1 top-1">{handle as ReactNode}</div>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    onClick={() => removeImage(image.id)}
                    aria-label="Quitar foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={images.length >= MENU_ITEM_MAX_IMAGES}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Agregar fotos
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Precio ($)</Label>
              <Input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Elegí categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3">
            <span className="text-sm font-medium text-gray-800">Disponible</span>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </label>

          <MenuOptionGroupsEditor groups={optionGroups} onChange={setOptionGroups} />

          <Button
            className="w-full rounded-full bg-servido-800"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {item ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
