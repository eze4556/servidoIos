import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { intlNumberLocale } from "@/i18n/config"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatPrice(price: number, locale?: string | null): string {
  return new Intl.NumberFormat(intlNumberLocale(locale), {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function formatPriceNumber(price: number, locale?: string | null): string {
  return new Intl.NumberFormat(intlNumberLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function formatPriceReduced(price: number, locale?: string | null): string {
  return new Intl.NumberFormat(intlNumberLocale(locale), {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function formatPriceNumberReduced(price: number, locale?: string | null): string {
  return new Intl.NumberFormat(intlNumberLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}


export function cleanAndFormatPrice(price: string | number): string {
  const priceStr = typeof price === 'number' ? price.toString() : price
  const cleaned = priceStr.replace(/[^\d.,]/g, '')
  const numPrice = parseFloat(cleaned.replace(',', '.'))
  if (isNaN(numPrice)) {
    return formatPriceNumber(0)
  }
  return formatPriceNumber(Math.round(numPrice))
}


export function formatLargeNumber(num: number, locale?: string | null): string {
  return new Intl.NumberFormat(intlNumberLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}
