"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { ARGENTINA_PROVINCES, VEHICLE_MAKES, modelsForMake } from "@/lib/vehicles/vehicle-catalog"
import {
  buildVehicleTitle,
  createVehicleListingDoc,
  updateVehicleListing,
} from "@/lib/vehicles/vehicle-listings"
import { uploadVehicleListingImage } from "@/lib/vehicles/vehicle-storage"
import type {
  VehicleCondition,
  VehicleFuelType,
  VehiclePriceCurrency,
  VehicleTransmission,
  VehicleType,
} from "@/types/vehicle-listing"
import type { ProductMedia } from "@/types/product"

const VEHICLE_TYPES: VehicleType[] = ["auto", "moto", "suv_pickup", "utilitario", "camion", "otro"]

interface VehicleListingFormProps {
  sellerId: string
  sellerDisplayName: string
  listingId?: string
  initial?: Partial<{
    vehicleType: VehicleType
    make: string
    model: string
    year: number
    condition: VehicleCondition
    mileageKm: number | null
    fuelType: VehicleFuelType | null
    transmission: VehicleTransmission | null
    color: string
    price: number
    priceCurrency: VehiclePriceCurrency
    province: string
    city: string
    locationLabel: string
    description: string
    media: ProductMedia[]
  }>
  onSuccess: () => void
  onCancel?: () => void
}

export function VehicleListingForm({
  sellerId,
  sellerDisplayName,
  listingId,
  initial,
  onSuccess,
  onCancel,
}: VehicleListingFormProps) {
  const t = useTranslations("vehicles")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])

  const [vehicleType, setVehicleType] = useState<VehicleType>(initial?.vehicleType || "auto")
  const [make, setMake] = useState(initial?.make || "")
  const [model, setModel] = useState(initial?.model || "")
  const [year, setYear] = useState(String(initial?.year || new Date().getFullYear()))
  const [condition, setCondition] = useState<VehicleCondition>(initial?.condition || "usado")
  const [mileageKm, setMileageKm] = useState(initial?.mileageKm != null ? String(initial.mileageKm) : "")
  const [fuelType, setFuelType] = useState<VehicleFuelType | "">(initial?.fuelType || "")
  const [transmission, setTransmission] = useState<VehicleTransmission | "">(initial?.transmission || "")
  const [color, setColor] = useState(initial?.color || "")
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "")
  const [priceCurrency, setPriceCurrency] = useState<VehiclePriceCurrency>(initial?.priceCurrency || "ARS")
  const [province, setProvince] = useState(initial?.province || "")
  const [city, setCity] = useState(initial?.city || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [existingMedia] = useState<ProductMedia[]>(initial?.media || [])

  const models = useMemo(() => (make ? modelsForMake(make) : []), [make])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const yearNum = Number(year)
    const priceNum = Number(price)
    if (!make || !model || !yearNum || !priceNum || !province || !city) {
      setError(t("formValidationRequired"))
      return
    }
    if (condition === "usado" && !mileageKm) {
      setError(t("formValidationMileage"))
      return
    }
    const newFiles = files
    const hasMedia = existingMedia.length > 0 || newFiles.length > 0
    if (!hasMedia) {
      setError(t("formValidationPhotos"))
      return
    }

    setSaving(true)
    try {
      const title = buildVehicleTitle(make, model, yearNum)
      const locationLabel = `${city}, ${province}`
      const baseInput = {
        vehicleType,
        make,
        model,
        trim: null,
        year: yearNum,
        condition,
        mileageKm: condition === "0km" ? null : Number(mileageKm) || 0,
        fuelType: fuelType || null,
        transmission: transmission || null,
        bodyType: null,
        doors: null,
        color: color || null,
        engine: null,
        price: priceNum,
        priceCurrency,
        province,
        city,
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
        id = await createVehicleListingDoc(sellerId, sellerDisplayName, { ...baseInput, media: [] })
      } else {
        await updateVehicleListing(id, sellerId, { ...baseInput, media: existingMedia })
      }

      const uploaded: ProductMedia[] = [...existingMedia]
      for (let i = 0; i < newFiles.length; i++) {
        const { url, path } = await uploadVehicleListingImage(sellerId, id, newFiles[i], i)
        uploaded.push({ type: "image", url, path })
      }

      if (uploaded.length === 0) {
        setError(t("formValidationPhotos"))
        return
      }

      await updateVehicleListing(id, sellerId, { media: uploaded })

      onSuccess()
    } catch (err) {
      const code = err instanceof Error ? err.message : ""
      if (code === "VEHICLE_LISTING_LIMIT") setError(t("formErrorLimit"))
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
          <Label>{t("formVehicleType")}</Label>
          <Select modal={false} value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              {VEHICLE_TYPES.map((vt) => (
                <SelectItem key={vt} value={vt}>
                  {t(`vehicleType.${vt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("formCurrency")}</Label>
          <Select modal={false} value={priceCurrency} onValueChange={(v) => setPriceCurrency(v as VehiclePriceCurrency)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              <SelectItem value="ARS">ARS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label>{t("formMake")}</Label>
          <Select
            modal={false}
            value={make || undefined}
            onValueChange={(v) => {
              setMake(v)
              setModel("")
            }}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={t("formSelect")} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              {VEHICLE_MAKES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label>{t("formModel")}</Label>
          <Select modal={false} value={model || undefined} onValueChange={setModel} disabled={!make}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={t("formSelect")} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("formYear")}</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} min={1980} max={2030} />
        </div>
        <div className="space-y-2">
          <Label>{t("formCondition")}</Label>
          <Select modal={false} value={condition} onValueChange={(v) => setCondition(v as VehicleCondition)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              <SelectItem value="0km">{t("condition.0km")}</SelectItem>
              <SelectItem value="usado">{t("condition.usado")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("formMileage")}</Label>
          <Input
            type="number"
            min={0}
            disabled={condition === "0km"}
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            className="w-full min-w-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("formPrice")}</Label>
          <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="w-full min-w-0" />
        </div>
        <div className="space-y-2">
          <Label>{t("formColor")}</Label>
          <Input value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("formFuel")}</Label>
          <Select
            modal={false}
            value={fuelType || "none"}
            onValueChange={(v) => setFuelType(v === "none" ? "" : (v as VehicleFuelType))}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              <SelectItem value="none">—</SelectItem>
              {(["nafta", "diesel", "gnc", "electrico", "hibrido", "otro"] as const).map((f) => (
                <SelectItem key={f} value={f}>
                  {t(`fuel.${f}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("formTransmission")}</Label>
          <Select
            modal={false}
            value={transmission || "none"}
            onValueChange={(v) => setTransmission(v === "none" ? "" : (v as VehicleTransmission))}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="manual">{t("transmission.manual")}</SelectItem>
              <SelectItem value="automatica">{t("transmission.automatica")}</SelectItem>
              <SelectItem value="otro">{t("transmission.otro")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label>{t("formProvince")}</Label>
          <Select modal={false} value={province || undefined} onValueChange={setProvince}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={t("formSelect")} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(16rem,50vh)]">
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
        <Label>{t("formDescription")}</Label>
        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[6rem] w-full min-w-0 resize-y" />
      </div>

      <div className="space-y-2">
        <Label>{t("formPhotos")}</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          className="w-full min-w-0 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-servido-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-servido-900"
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
        />
        {existingMedia.length > 0 && (
          <p className="text-xs text-muted-foreground">{t("formExistingPhotos", { count: existingMedia.length })}</p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:flex-row sm:flex-wrap sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="h-11 w-full bg-servido-800 hover:bg-servido-900 sm:h-10 sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : listingId ? t("formSave") : t("formPublish")}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={onCancel}>
            {t("formCancel")}
          </Button>
        )}
      </div>
    </form>
  )
}
