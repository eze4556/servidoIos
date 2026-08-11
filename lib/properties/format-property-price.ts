import type { PropertyPriceCurrency } from "@/types/property-listing"

export function formatPropertyPrice(
  amount: number,
  currency: PropertyPriceCurrency,
  locale: string = "es-AR"
): string {
  const intlLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
