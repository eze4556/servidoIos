"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { deleteStoragePaths, uploadRestaurantBrandingImage, validateRestaurantImageFile } from "@/lib/restaurant-storage"
import type { Restaurant } from "@/types/restaurant"
import { getRestaurantCoverUrl, getRestaurantLogoUrl } from "@/types/restaurant"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface RestaurantBrandingFormProps {
  restaurant: Restaurant
  onUpdated: (next: Restaurant) => void
  disabled?: boolean
}

export function RestaurantBrandingForm({ restaurant, onUpdated, disabled }: RestaurantBrandingFormProps) {
  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coverUrl = getRestaurantCoverUrl(restaurant)
  const logoUrl = getRestaurantLogoUrl(restaurant)

  const persist = async (patch: Partial<Restaurant>) => {
    await updateDoc(doc(db, "restaurants", restaurant.id), {
      ...patch,
      updatedAt: serverTimestamp(),
    })
    onUpdated({ ...restaurant, ...patch })
  }

  const handleUpload = async (kind: "cover" | "logo", file: File | undefined) => {
    if (!file || disabled) return
    const validation = validateRestaurantImageFile(file)
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    const setUploading = kind === "cover" ? setUploadingCover : setUploadingLogo
    setUploading(true)
    try {
      const previousPath = kind === "cover" ? restaurant.coverImagePath : restaurant.logoPath
      const uploaded = await uploadRestaurantBrandingImage(restaurant.id, kind, file, previousPath)
      if (kind === "cover") {
        await persist({
          coverImageUrl: uploaded.url,
          coverImagePath: uploaded.path,
          // Keep legacy field in sync for older cards
          imageUrl: restaurant.logoUrl || uploaded.url,
        })
      } else {
        await persist({
          logoUrl: uploaded.url,
          logoPath: uploaded.path,
          imageUrl: uploaded.url,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (kind: "cover" | "logo") => {
    if (disabled) return
    setError(null)
    try {
      if (kind === "cover") {
        await deleteStoragePaths([restaurant.coverImagePath])
        await persist({ coverImageUrl: null, coverImagePath: null })
      } else {
        await deleteStoragePaths([restaurant.logoPath])
        await persist({
          logoUrl: null,
          logoPath: null,
          imageUrl: restaurant.coverImageUrl || undefined,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la imagen")
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100">
      <div>
        <h2 className="font-semibold text-gray-900">Portada y logo</h2>
        <p className="mt-1 text-sm text-gray-500">
          La portada se ve arriba del perfil público y el logo aparece sobre ella.
        </p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-2">
        <Label>Portada (horizontal)</Label>
        <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-red-500">
          {coverUrl ? (
            <Image src={coverUrl} alt="Portada" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/90">Sin portada</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              void handleUpload("cover", e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={disabled || uploadingCover}
            onClick={() => coverInputRef.current?.click()}
          >
            {uploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {coverUrl ? "Reemplazar portada" : "Subir portada"}
          </Button>
          {restaurant.coverImageUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={disabled || uploadingCover}
              onClick={() => void handleRemove("cover")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Logo (cuadrado)</Label>
        <div className="relative h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-red-500 ring-4 ring-white shadow">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/90">Sin logo</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              void handleUpload("logo", e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={disabled || uploadingLogo}
            onClick={() => logoInputRef.current?.click()}
          >
            {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {logoUrl ? "Reemplazar logo" : "Subir logo"}
          </Button>
          {restaurant.logoUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={disabled || uploadingLogo}
              onClick={() => void handleRemove("logo")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
