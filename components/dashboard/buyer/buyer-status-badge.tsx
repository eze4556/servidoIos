"use client"

import { CheckCircle, Clock, Package, Truck, XCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function getShippingIcon(status: string) {
  switch (status) {
    case "pendiente":
      return <Clock className="h-3.5 w-3.5" />
    case "preparacion":
      return <Package className="h-3.5 w-3.5" />
    case "enviado":
      return <Truck className="h-3.5 w-3.5" />
    case "entregado":
      return <CheckCircle className="h-3.5 w-3.5" />
    case "cancelado":
      return <XCircle className="h-3.5 w-3.5" />
    default:
      return <Clock className="h-3.5 w-3.5" />
  }
}

export function getShippingBadgeClass(status: string) {
  switch (status) {
    case "pendiente":
      return "bg-amber-100 text-amber-800 ring-amber-200/60"
    case "preparacion":
      return "bg-sky-100 text-sky-800 ring-sky-200/60"
    case "enviado":
      return "bg-purple-100 text-purple-800 ring-purple-200/60"
    case "entregado":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200/60"
    case "cancelado":
      return "bg-rose-100 text-rose-800 ring-rose-200/60"
    default:
      return "bg-gray-100 text-gray-700 ring-gray-200/60"
  }
}

export function getPaymentBadgeClass(status: string) {
  switch (status) {
    case "pagado":
    case "approved":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200/60"
    case "pendiente":
    case "pending":
      return "bg-amber-100 text-amber-800 ring-amber-200/60"
    case "rechazado":
    case "rejected":
      return "bg-rose-100 text-rose-800 ring-rose-200/60"
    case "cancelado":
    case "cancelled":
      return "bg-gray-100 text-gray-700 ring-gray-200/60"
    default:
      return "bg-gray-100 text-gray-700 ring-gray-200/60"
  }
}

interface StatusBadgeProps {
  status: string
  type?: "payment" | "shipping"
  className?: string
}

export function StatusBadge({ status, type = "payment", className }: StatusBadgeProps) {
  const t = useTranslations("buyerDashboard")
  const badgeClass = type === "shipping" ? getShippingBadgeClass(status) : getPaymentBadgeClass(status)
  const label =
    type === "shipping"
      ? (t.has(`shipping.${status}` as "shipping.pendiente") ? t(`shipping.${status}` as "shipping.pendiente") : t("shipping.unknown"))
      : t.has(`payment.${status}` as "payment.pagado")
        ? t(`payment.${status}` as "payment.pagado")
        : status

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        badgeClass,
        className
      )}
    >
      {type === "shipping" && getShippingIcon(status)}
      {label}
    </span>
  )
}
