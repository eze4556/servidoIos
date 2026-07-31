"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useLocale, useTranslations } from "next-intl"
import { formatPriceNumber } from "@/lib/utils"

interface PaymentDateButtonProps {
  paymentDate?: string | null
  productName?: string
  amount?: number
  status?: "pendiente" | "pagado" | "cancelado"
  className?: string
}

export function PaymentDateButton({
  paymentDate,
  productName,
  amount = 0,
  status = "pendiente",
  className = "",
}: PaymentDateButtonProps) {
  const t = useTranslations("paymentDateButton")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const [isOpen, setIsOpen] = useState(false)

  const displayName = productName || t("defaultProductName")

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return t("dateUnavailable")
    }
  }

  const getStatusColor = (value: string) => {
    switch (value) {
      case "pagado":
        return "bg-green-100 text-green-800"
      case "pendiente":
        return "bg-yellow-100 text-yellow-800"
      case "cancelado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (value: string) => {
    if (value === "pagado" || value === "pendiente" || value === "cancelado") {
      return t(`status.${value}`)
    }
    return t("status.unknown")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`flex items-center gap-2 ${className}`}>
          <Calendar className="h-4 w-4" />
          {t("triggerLabel")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogDescription", { productName: displayName })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="font-medium">{t("statusLabel")}</span>
            <Badge className={getStatusColor(status)}>{getStatusText(status)}</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="font-medium">{t("paymentDateLabel")}</span>
            <span className="text-sm">{paymentDate ? formatDate(paymentDate) : t("notAvailable")}</span>
          </div>

          {amount > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="font-medium">{t("amountLabel")}</span>
              <span className="font-semibold text-green-600">{formatPriceNumber(amount)}</span>
            </div>
          )}

          {!paymentDate && status === "pendiente" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <strong>{t("pendingNoteStrong")}</strong> {t("pendingNote")}
              </p>
            </div>
          )}

          {paymentDate && status === "pagado" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                <strong>✓ {t("paidNoteStrong")}</strong> {t("paidNote")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
