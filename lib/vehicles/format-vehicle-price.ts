import type { VehiclePriceCurrency } from "@/types/vehicle-listing"

export function formatVehiclePrice(
  amount: number,
  currency: VehiclePriceCurrency,
  locale: string = "es-AR"
): string {
  const intlLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 0 : 0,
  }).format(amount)
}
