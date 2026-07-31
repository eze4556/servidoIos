"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MapPin, User, Phone, FileText } from "lucide-react"

interface ShippingAddressButtonProps {
  shippingAddress?: {
    fullName: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    dni?: string
    additionalInfo?: string
  } | null
  productName?: string
  className?: string
}

export function ShippingAddressButton({
  shippingAddress,
  productName,
  className = "",
}: ShippingAddressButtonProps) {
  const t = useTranslations("shippingAddress")
  const tf = useTranslations("favorites")
  const [isOpen, setIsOpen] = useState(false)

  const displayProductName = productName || tf("product")

  if (!shippingAddress) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`flex cursor-not-allowed items-center gap-2 text-gray-400 ${className}`}
        disabled
      >
        <MapPin className="h-4 w-4" />
        {t("noAddress")}
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`flex items-center gap-2 text-xs sm:text-sm ${className}`}>
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{t("viewLong")}</span>
          <span className="sm:hidden">{t("viewShort")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="mx-4 max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("descriptionForProduct", { productName: displayProductName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2 sm:gap-3 sm:p-3">
            <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 sm:h-5 sm:w-5" />
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-600 sm:text-sm">{t("fullNameLabel")}</span>
              <p className="text-sm font-semibold sm:text-base">{shippingAddress.fullName}</p>
            </div>
          </div>

          {shippingAddress.dni && (
            <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2 sm:gap-3 sm:p-3">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 sm:h-5 sm:w-5" />
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-600 sm:text-sm">{t("dniLabel")}</span>
                <p className="text-sm font-semibold sm:text-base">{shippingAddress.dni}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2 sm:gap-3 sm:p-3">
            <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 sm:h-5 sm:w-5" />
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-600 sm:text-sm">{t("phoneLabel")}</span>
              <p className="text-sm font-semibold sm:text-base">{shippingAddress.phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2 sm:gap-3 sm:p-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 sm:h-5 sm:w-5" />
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-600 sm:text-sm">{t("addressLabel")}</span>
              <div className="space-y-1">
                <p className="text-sm font-semibold sm:text-base">{shippingAddress.address}</p>
                <p className="text-xs text-gray-700 sm:text-sm">
                  {shippingAddress.city}, {shippingAddress.state}
                </p>
                <p className="text-xs text-gray-600 sm:text-sm">
                  {t("zipLabel", { code: shippingAddress.zipCode })}
                </p>
              </div>
            </div>
          </div>

          {shippingAddress.additionalInfo && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 sm:p-3">
              <span className="text-xs font-medium text-blue-800 sm:text-sm">{t("additionalNote")}</span>
              <p className="mt-1 text-xs text-blue-700 sm:text-sm">{shippingAddress.additionalInfo}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
