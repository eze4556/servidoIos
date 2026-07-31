"use client"

import { useState, useEffect, useCallback } from "react"
import { useLocale } from "next-intl"
import { formatPrice, formatPriceNumber, formatPriceReduced, formatPriceNumberReduced } from "@/lib/utils"

export const PRICE_FORMAT_PREFERENCE_EVENT = "priceFormatPreferenceChange"
const STORAGE_KEY = "priceFormatReducedDecimals"

function readReducedPreference(): boolean {
  if (typeof window === "undefined") return false
  const savedPreference = localStorage.getItem(STORAGE_KEY)
  if (savedPreference === null) return false
  try {
    return JSON.parse(savedPreference) as boolean
  } catch {
    return false
  }
}

export function usePriceFormat() {
  const locale = useLocale()
  const [useReducedDecimals, setUseReducedDecimals] = useState(false)

  const syncFromStorage = useCallback(() => {
    setUseReducedDecimals(readReducedPreference())
  }, [])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener("storage", syncFromStorage)
    window.addEventListener(PRICE_FORMAT_PREFERENCE_EVENT, syncFromStorage)
    return () => {
      window.removeEventListener("storage", syncFromStorage)
      window.removeEventListener(PRICE_FORMAT_PREFERENCE_EVENT, syncFromStorage)
    }
  }, [syncFromStorage])

  const formatPriceWithConfig = (price: number): string => {
    return useReducedDecimals ? formatPriceReduced(price, locale) : formatPrice(price, locale)
  }

  const formatPriceNumberWithConfig = (price: number): string => {
    return useReducedDecimals
      ? formatPriceNumberReduced(price, locale)
      : formatPriceNumber(price, locale)
  }

  const updatePriceFormat = (useReduced: boolean) => {
    setUseReducedDecimals(useReduced)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(useReduced))
    window.dispatchEvent(new Event(PRICE_FORMAT_PREFERENCE_EVENT))
  }

  return {
    useReducedDecimals,
    formatPrice: formatPriceWithConfig,
    formatPriceNumber: formatPriceNumberWithConfig,
    updatePriceFormat,
  }
}
