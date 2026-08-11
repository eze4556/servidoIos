"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { ARGENTINA_PROVINCES } from "@/lib/properties/property-catalog"
import {
  buildPropertyTitle,
  createPropertyListingDoc,
  updatePropertyListing,
} from "@/lib/properties/property-listings"
import {
  uploadPropertyListingImage,
  uploadPropertyListingVideo,
} from "@/lib/properties/property-storage"
import type { PropertyOperation, PropertyPriceCurrency, PropertyType } from "@/types/property-listing"
import { MAX_PROPERTY_IMAGES, MAX_PROPERTY_VIDEOS } from "@/types/property-listing"
import type { ProductMedia } from "@/types/product"

const PROPERTY_TYPES: PropertyType[] = ["casa", "departamento", "terreno", "local", "galpon", "campo", "ph", "otro"]
const OPERATIONS: PropertyOperation[] = ["venta", "alquiler", "alquiler_temporario"]

interface PropertyListingFormProps {
  sellerId: string
  sellerDisplayName: string
  listingId?: string
  initial?: Partial<{
    propertyType: PropertyType
    operation: PropertyOperation
    rooms: number | null
    bathrooms: number | null
    coveredM2: number | null
    totalM2: number | null
    price: number
    priceCurrency: PropertyPriceCurrency
    expenses: number | null
    province: string
    city: string
    neighborhood: string
    locationLabel: string
    description: string
    media: ProductMedia[]
  }>
  onSuccess: () => void
  onCancel?: () => void
}

export function PropertyListingForm({
  sellerId,
  sellerDisplayName,
  listingId,
  initial,
  onSuccess,
  onCancel,
}: PropertyListingFormProps) {
  const t = useTranslations("properties")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])

  const [propertyType, setPropertyType] = useState<PropertyType>(initial?.propertyType || "casa")
  const [operation, setOperation] = useState<PropertyOperation>(initial?.operation || "venta")
  const [rooms, setRooms] = useState(initial?.rooms != null ? String(initial.rooms) : "")
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms != null ? String(initial.bathrooms) : "")
  const [coveredM2, setCoveredM2] = useState(initial?.coveredM2 != null ? String(initial.coveredM2) : "")
  const [totalM2, setTotalM2] = useState(initial?.totalM2 != null ? String(initial.totalM2) : "")
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "")
  const [priceCurrency, setPriceCurrency] = useState<PropertyPriceCurrency>(initial?.priceCurrency || "ARS")
  const [expenses, setExpenses] = useState(initial?.expenses != null ? String(initial.expenses) : "")
  const [province, setProvince] = useState(initial?.province || "")
  const [city, setCity] = useState(initial?.city || "")
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [existingMedia] = useState<ProductMedia[]>(initial?.media || [])

  const existingImages = existingMedia.filter((m) => m.type === "image").length
  const existingVideos = existingMedia.filter((m) => m.type === "video").length

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const priceNum = Number(price)
    if (!priceNum || !province || !city) {
      setError(t("formValidationRequired"))
      return
    }
    const hasMedia = existingMedia.length > 0 || imageFiles.length > 0 || videoFiles.length > 0
    if (!hasMedia) {
      setError(t("formValidationMedia"))
      return
    }
    if (existingImages + imageFiles.length > MAX_PROPERTY_IMAGES) {
      setError(t("formValidationMaxImages", { max: MAX_PROPERTY_IMAGES }))
      return
    }
    if (existingVideos + videoFiles.length > MAX_PROPERTY_VIDEOS) {
      setError(t("formValidationMaxVideos", { max: MAX_PROPERTY_VIDEOS }))
      return
    }

    setSaving(true)
    try {
      const roomsNum = rooms ? Number(rooms) : null
      const locationLabel = [neighborhood, city, province].filter(Boolean).join(", ")
      const title = buildPropertyTitle(operation, propertyType, city, roomsNum)
      const baseInput = {
        propertyType,
        operation,
        rooms: roomsNum,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        coveredM2: coveredM2 ? Number(coveredM2) : null,
        totalM2: totalM2 ? Number(totalM2) : null,
        price: priceNum,
        priceCurrency,
        expenses: expenses ? Number(expenses) : null,
        province,
        city,
        neighborhood: neighborhood || null,
        locationLabel,
        latitude: null,
        longitude: null,
        title,
        description: description.trim(),
        media: existingMedia,
        allowChat: true,
      }

      let id = listingId
      if (!id) {
        id = await createPropertyListingDoc(sellerId, sellerDisplayName, { ...baseInput, media: [] })
      } else {
        await updatePropertyListing(id, sellerId, { ...baseInput, media: existingMedia })
      }

      const uploaded: ProductMedia[] = [...existingMedia]
      for (let i = 0; i < imageFiles.length; i++) {
        const { url, path } = await uploadPropertyListingImage(sellerId, id, imageFiles[i], i)
        uploaded.push({ type: "image", url, path })
      }
      for (let i = 0; i < videoFiles.length; i++) {
        const { url, path } = await uploadPropertyListingVideo(sellerId, id, videoFiles[i], i)
        uploaded.push({ type: "video", url, path })
      }

      await updatePropertyListing(id, sellerId, { media: uploaded })
      onSuccess()
    } catch (err) {
      const code = err instanceof Error ? err.message : ""
      if (code === "PROPERTY_LISTING_LIMIT") setError(t("formErrorLimit"))
      else if (code.includes("property_video")) setError(t("formErrorVideo"))
      else if (code.includes("property_image")) setError(t("formErrorImage"))
      else setError(t("formErrorGeneric"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("publishFreeNote")}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("formOperation")}</Label>
          <Select modal={false} value={operation} onValueChange={(v) => setOperation(v as PropertyOperation)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATIONS.map((op) => (
                <SelectItem key={op} value={op}>
                  {t(`operation.${op}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("formPropertyType")}</Label>
          <Select modal={false} value={propertyType} onValueChange={(v) => setPropertyType(v as PropertyType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((pt) => (
                <SelectItem key={pt} value={pt}>
                  {t(`propertyType.${pt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-2">
          <Label>{t("formRooms")}</Label>
          <Input type="number" min={0} value={rooms} onChange={(e) => setRooms(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("formBathrooms")}</Label>
          <Input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("formCoveredM2")}</Label>
          <Input type="number" min={0} value={coveredM2} onChange={(e) => setCoveredM2(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("formTotalM2")}</Label>
          <Input type="number" min={0} value={totalM2} onChange={(e) => setTotalM2(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("formPrice")}</Label>
          <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("formCurrency")}</Label>
          <Select modal={false} value={priceCurrency} onValueChange={(v) => setPriceCurrency(v as PropertyPriceCurrency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">ARS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("formExpenses")}</Label>
          <Input type="number" min={0} value={expenses} onChange={(e) => setExpenses(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("formProvince")}</Label>
          <Select modal={false} value={province || undefined} onValueChange={setProvince}>
            <SelectTrigger>
              <SelectValue placeholder={t("formSelect")} />
            </SelectTrigger>
            <SelectContent>
              {ARGENTINA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("formCity")}</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("formNeighborhood")}</Label>
        <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("formDescription")}</Label>
        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("formPhotos")}</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImageFiles(e.target.files ? Array.from(e.target.files) : [])}
        />
        <p className="text-xs text-muted-foreground">{t("formPhotosHint", { max: MAX_PROPERTY_IMAGES })}</p>
      </div>

      <div className="space-y-2">
        <Label>{t("formVideos")}</Label>
        <Input
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          multiple
          onChange={(e) => setVideoFiles(e.target.files ? Array.from(e.target.files) : [])}
        />
        <p className="text-xs text-muted-foreground">{t("formVideosHint", { max: MAX_PROPERTY_VIDEOS })}</p>
      </div>

      {existingMedia.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("formExistingMedia", { count: existingMedia.length })}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={saving} className="bg-servido-800 hover:bg-servido-900">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : listingId ? t("formSave") : t("formPublish")}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("formCancel")}
          </Button>
        )}
      </div>
    </form>
  )
}
