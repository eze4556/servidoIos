type ShippingStatus = "pendiente" | "en_preparacion" | "enviado" | "entregado" | "cancelado"

type ShippingStatusTranslator = (key: `sales.filters.shipping.${ShippingStatus}`) => string

export function getShippingStatusLabel(t: ShippingStatusTranslator, status: string): string {
  if (status === "pendiente") return t("sales.filters.shipping.pendiente")
  if (status === "en_preparacion") return t("sales.filters.shipping.en_preparacion")
  if (status === "enviado") return t("sales.filters.shipping.enviado")
  if (status === "entregado") return t("sales.filters.shipping.entregado")
  if (status === "cancelado") return t("sales.filters.shipping.cancelado")
  return status
}

type PurchaseStatusTranslator = (key: "sales.purchaseStatus.approved" | "sales.purchaseStatus.pending" | "sales.purchaseStatus.cancelled") => string

export function getPurchaseStatusLabel(t: PurchaseStatusTranslator, status: string): string {
  if (status === "approved") return t("sales.purchaseStatus.approved")
  if (status === "pending") return t("sales.purchaseStatus.pending")
  if (status === "cancelled") return t("sales.purchaseStatus.cancelled")
  return status
}
