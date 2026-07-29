"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Phone, User, Home, FileText } from "lucide-react"

export interface ShippingAddress {
  fullName: string
  phone: string
  dni: string
  address: string
  city: string
  state: string
  zipCode: string
  additionalInfo?: string
}

interface ShippingFormProps {
  onSubmit: (address: ShippingAddress) => void
  onCancel: () => void
  loading?: boolean
}

export function ShippingForm({ onSubmit, onCancel, loading = false }: ShippingFormProps) {
  const t = useTranslations("shippingForm")
  const [formData, setFormData] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    dni: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    additionalInfo: ""
  })

  const [errors, setErrors] = useState<Partial<ShippingAddress>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingAddress> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = t("errors.fullNameRequired")
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t("errors.phoneRequired")
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = t("errors.phoneInvalid")
    }

    if (!formData.dni.trim()) {
      newErrors.dni = t("errors.dniRequired")
    } else if (!/^\d{7,8}$/.test(formData.dni.replace(/\D/g, ''))) {
      newErrors.dni = t("errors.dniInvalid")
    }

    if (!formData.address.trim()) {
      newErrors.address = t("errors.addressRequired")
    }

    if (!formData.city.trim()) {
      newErrors.city = t("errors.cityRequired")
    }

    if (!formData.state.trim()) {
      newErrors.state = t("errors.stateRequired")
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = t("errors.zipRequired")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
   
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("fullName")}
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder={t("fullNamePlaceholder")}
              className={errors.fullName ? "border-red-500" : ""}
            />
            {errors.fullName && (
              <p className="text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t("phone")}
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder={t("phonePlaceholder")}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* DNI */}
          <div className="space-y-2">
            <Label htmlFor="dni" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("dni")}
            </Label>
            <Input
              id="dni"
              value={formData.dni}
              onChange={(e) => handleInputChange("dni", e.target.value)}
              placeholder={t("dniPlaceholder")}
              className={errors.dni ? "border-red-500" : ""}
            />
            {errors.dni && (
              <p className="text-sm text-red-600">{errors.dni}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t("address")}
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder={t("addressPlaceholder")}
              className={errors.address ? "border-red-500" : ""}
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Ciudad y Provincia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t("city")}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder={t("cityPlaceholder")}
                className={errors.city ? "border-red-500" : ""}
              />
              {errors.city && (
                <p className="text-sm text-red-600">{errors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t("state")}</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange("state", e.target.value)}
                placeholder={t("statePlaceholder")}
                className={errors.state ? "border-red-500" : ""}
              />
              {errors.state && (
                <p className="text-sm text-red-600">{errors.state}</p>
              )}
            </div>
          </div>

          {/* Código Postal */}
          <div className="space-y-2">
            <Label htmlFor="zipCode">{t("zipCode")}</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
              placeholder={t("zipPlaceholder")}
              className={errors.zipCode ? "border-red-500" : ""}
            />
            {errors.zipCode && (
              <p className="text-sm text-red-600">{errors.zipCode}</p>
            )}
          </div>

          {/* Información adicional */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">{t("additionalInfo")}</Label>
            <Textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
              placeholder={t("additionalPlaceholder")}
              rows={2}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? t("processing") : t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 