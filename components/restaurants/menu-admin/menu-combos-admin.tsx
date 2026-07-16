"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { mapMenuPromotionDoc } from "@/lib/restaurant-options"
import {
  deleteStoragePaths,
  uploadMenuPromotionImage,
  validateRestaurantImageFile,
} from "@/lib/restaurant-storage"
import type { MenuItem, MenuPromotion, MenuPromotionIncludedItem } from "@/types/restaurant"
import { formatPriceNumber } from "@/lib/utils"
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
import { Checkbox } from "@/components/ui/checkbox"

interface MenuCombosAdminProps {
  restaurantId: string
  menuItems: MenuItem[]
  enabled: boolean
  onNeedSubscription: () => void
}

export function MenuCombosAdmin({
  restaurantId,
  menuItems,
  enabled,
  onNeedSubscription,
}: MenuCombosAdminProps) {
  const [promotions, setPromotions] = useState<MenuPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MenuPromotion | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [comboPrice, setComboPrice] = useState("")
  const [available, setAvailable] = useState(true)
  const [included, setIncluded] = useState<Record<string, number>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.available !== false),
    [menuItems]
  )

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, "menuPromotions"), where("restaurantId", "==", restaurantId))
      )
      const next = snap.docs
        .map((d) => mapMenuPromotionDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
      setPromotions(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los combos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [restaurantId])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const setComboImage = (file: File | undefined) => {
    if (!file) return
    const validation = validateRestaurantImageFile(file)
    if (validation) {
      setError(validation)
      return
    }
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
  }

  const openCreate = () => {
    if (!enabled) {
      onNeedSubscription()
      return
    }
    setEditing(null)
    setName("")
    setDescription("")
    setComboPrice("")
    setAvailable(true)
    setIncluded({})
    setImageFile(null)
    setImagePreview(null)
    setError(null)
    setFormOpen(true)
  }

  const openEdit = (promo: MenuPromotion) => {
    if (!enabled) {
      onNeedSubscription()
      return
    }
    setEditing(promo)
    setName(promo.name)
    setDescription(promo.description || "")
    setComboPrice(String(promo.comboPrice))
    setAvailable(promo.available !== false)
    setImageFile(null)
    setImagePreview(promo.imageUrl || null)
    const map: Record<string, number> = {}
    for (const item of promo.includedItems) {
      map[item.menuItemId] = item.quantity
    }
    setIncluded(map)
    setError(null)
    setFormOpen(true)
  }

  const toggleIncluded = (menuItemId: string, checked: boolean) => {
    setIncluded((prev) => {
      const next = { ...prev }
      if (checked) next[menuItemId] = next[menuItemId] || 1
      else delete next[menuItemId]
      return next
    })
  }

  const handleSave = async () => {
    if (!enabled) {
      onNeedSubscription()
      return
    }
    if (!name.trim()) {
      setError("Ingresá el nombre del combo")
      return
    }
    const priceNum = Number(comboPrice)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Ingresá un precio válido")
      return
    }
    const includedItems: MenuPromotionIncludedItem[] = Object.entries(included)
      .map(([menuItemId, quantity]) => {
        const item = menuItems.find((m) => m.id === menuItemId)
        if (!item || quantity <= 0) return null
        return { menuItemId, name: item.name, quantity }
      })
      .filter((x): x is MenuPromotionIncludedItem => Boolean(x))

    if (includedItems.length === 0) {
      setError("Elegí al menos un producto incluido")
      return
    }

    setSaving(true)
    setError(null)
    let uploadedPath: string | null = null
    try {
      const promotionRef = editing
        ? doc(db, "menuPromotions", editing.id)
        : doc(collection(db, "menuPromotions"))
      let imageUrl = editing?.imageUrl || null
      let imagePath = editing?.imagePath || null

      if (imageFile) {
        const uploaded = await uploadMenuPromotionImage(
          restaurantId,
          promotionRef.id,
          imageFile
        )
        imageUrl = uploaded.url
        imagePath = uploaded.path
        uploadedPath = uploaded.path
      }

      const payload = {
        restaurantId,
        name: name.trim(),
        description: description.trim(),
        type: "combo" as const,
        available,
        comboPrice: priceNum,
        includedItems,
        sortOrder: editing?.sortOrder ?? promotions.length,
        imageUrl,
        imagePath,
        updatedAt: serverTimestamp(),
      }

      if (editing) {
        await updateDoc(promotionRef, payload)
        if (imageFile && editing.imagePath && editing.imagePath !== imagePath) {
          await deleteStoragePaths([editing.imagePath])
        }
        setPromotions((prev) =>
          prev.map((p) =>
            p.id === editing.id
              ? {
                  ...p,
                  ...payload,
                  description: description.trim(),
                }
              : p
          )
        )
      } else {
        await setDoc(promotionRef, {
          ...payload,
          createdAt: serverTimestamp(),
        })
        setPromotions((prev) => [
          ...prev,
          {
            id: promotionRef.id,
            restaurantId,
            name: name.trim(),
            description: description.trim(),
            type: "combo",
            available,
            comboPrice: priceNum,
            includedItems,
            sortOrder: promotions.length,
            imageUrl,
            imagePath,
          },
        ])
      }
      setFormOpen(false)
    } catch (err) {
      if (uploadedPath) await deleteStoragePaths([uploadedPath])
      setError(err instanceof Error ? err.message : "No se pudo guardar el combo")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (promo: MenuPromotion) => {
    if (!enabled) {
      onNeedSubscription()
      return
    }
    if (!window.confirm(`¿Eliminar el combo "${promo.name}"?`)) return
    await deleteDoc(doc(db, "menuPromotions", promo.id))
    await deleteStoragePaths([promo.imagePath])
    setPromotions((prev) => prev.filter((p) => p.id !== promo.id))
  }

  const toggleAvailable = async (promo: MenuPromotion) => {
    if (!enabled) {
      onNeedSubscription()
      return
    }
    await updateDoc(doc(db, "menuPromotions", promo.id), {
      available: !promo.available,
      updatedAt: serverTimestamp(),
    })
    setPromotions((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, available: !p.available } : p))
    )
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
      {error && !formOpen && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Combos / promociones</h2>
          <p className="text-sm text-gray-500">
            Precio fijo e ítems incluidos. El cliente no elige variantes dentro del combo.
          </p>
        </div>
        <Button className="rounded-full bg-servido-800" disabled={!enabled} onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo combo
        </Button>
      </div>

      {promotions.length === 0 ? (
        <p className="text-center text-gray-500">Todavía no tenés combos.</p>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
                {promo.imageUrl ? (
                  <Image
                    src={promo.imageUrl}
                    alt={promo.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] font-semibold text-white">
                    Combo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{promo.name}</p>
                <p className="text-sm text-gray-500">
                  ${formatPriceNumber(promo.comboPrice)} ·{" "}
                  {promo.includedItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                </p>
              </div>
              <Switch
                checked={promo.available}
                onCheckedChange={() => void toggleAvailable(promo)}
                disabled={!enabled}
              />
              <Button variant="ghost" size="icon" disabled={!enabled} onClick={() => openEdit(promo)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!enabled}
                onClick={() => void handleDelete(promo)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar combo" : "Nuevo combo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="space-y-2">
              <Label>Imagen del combo</Label>
              <div className="flex items-center gap-3">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Vista previa del combo"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-white">
                      Combo
                    </div>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {imagePreview ? "Reemplazar" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      setComboImage(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">JPG, PNG, WEBP o GIF. Máximo 5 MB.</p>
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
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Precio del combo ($)</Label>
              <Input
                type="number"
                min="0"
                value={comboPrice}
                onChange={(e) => setComboPrice(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <label className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3">
              <span className="text-sm font-medium">Disponible</span>
              <Switch checked={available} onCheckedChange={setAvailable} />
            </label>
            <div className="space-y-2">
              <Label>Productos incluidos</Label>
              {availableMenuItems.length === 0 ? (
                <p className="text-sm text-gray-500">Primero cargá productos en el menú.</p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-gray-100 p-3">
                  {availableMenuItems.map((item) => {
                    const checked = Boolean(included[item.id])
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleIncluded(item.id, value === true)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">${formatPriceNumber(item.price)}</p>
                        </div>
                        {checked && (
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-16 rounded-lg"
                            value={included[item.id]}
                            onChange={(e) =>
                              setIncluded((prev) => ({
                                ...prev,
                                [item.id]: Math.max(1, Number(e.target.value) || 1),
                              }))
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <Button
              className="w-full rounded-full bg-servido-800"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar combo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
