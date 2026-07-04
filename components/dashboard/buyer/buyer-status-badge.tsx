import { CheckCircle, Clock, Package, Truck, XCircle } from "lucide-react"
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

export function getShippingStatusText(status: string) {
  switch (status) {
    case "pendiente":
      return "Pendiente"
    case "preparacion":
      return "En preparación"
    case "enviado":
      return "Enviado"
    case "entregado":
      return "Entregado"
    case "cancelado":
      return "Cancelado"
    default:
      return "Desconocido"
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

export function getPaymentStatusText(status: string) {
  switch (status) {
    case "pagado":
      return "Pagado"
    case "pendiente":
      return "Pendiente"
    case "rechazado":
      return "Rechazado"
    case "cancelado":
      return "Cancelado"
    case "approved":
      return "Aprobado"
    case "pending":
      return "Pendiente"
    case "rejected":
      return "Rechazado"
    case "cancelled":
      return "Cancelado"
    default:
      return status
  }
}

interface StatusBadgeProps {
  status: string
  type?: "payment" | "shipping"
  className?: string
}

export function StatusBadge({ status, type = "payment", className }: StatusBadgeProps) {
  const badgeClass = type === "shipping" ? getShippingBadgeClass(status) : getPaymentBadgeClass(status)
  const label = type === "shipping" ? getShippingStatusText(status) : getPaymentStatusText(status)

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
