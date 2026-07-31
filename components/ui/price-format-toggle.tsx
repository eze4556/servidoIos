"use client"

import { useState, useEffect, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, DollarSign } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { intlNumberLocale } from "@/i18n/config"
import { PRICE_FORMAT_PREFERENCE_EVENT } from "@/hooks/use-price-format"

interface PriceFormatToggleProps {
  onFormatChange?: (useReducedDecimals: boolean) => void
  className?: string
}

function formatExamplePrice(
  locale: string,
  amount: number,
  useReducedDecimals: boolean
): string {
  const intlLocale = intlNumberLocale(locale)
  if (useReducedDecimals) {
    const hasFraction = Math.abs(amount - Math.trunc(amount)) > 1e-9
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(amount)
  }
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function PriceFormatToggle({ onFormatChange, className = "" }: PriceFormatToggleProps) {
  const t = useTranslations("sellerDashboard.priceFormat")
  const locale = useLocale()
  const [useReducedDecimals, setUseReducedDecimals] = useState(false)

  useEffect(() => {
    const savedPreference = localStorage.getItem("priceFormatReducedDecimals")
    if (savedPreference !== null) {
      setUseReducedDecimals(JSON.parse(savedPreference))
    }
  }, [])

  const handleToggle = (checked: boolean) => {
    setUseReducedDecimals(checked)
    localStorage.setItem("priceFormatReducedDecimals", JSON.stringify(checked))
    window.dispatchEvent(new Event(PRICE_FORMAT_PREFERENCE_EVENT))
    onFormatChange?.(checked)
  }

  const exampleFull = useMemo(
    () => formatExamplePrice(locale, 1250, useReducedDecimals),
    [locale, useReducedDecimals]
  )
  const exampleWithDecimals = useMemo(
    () => formatExamplePrice(locale, 1250.5, useReducedDecimals),
    [locale, useReducedDecimals]
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="price-format" className="text-base font-medium">
              {t("toggleLabel")}
            </Label>
            <p className="text-sm text-muted-foreground">{t("toggleHint")}</p>
          </div>
          <Switch
            id="price-format"
            checked={useReducedDecimals}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t("examplesTitle")}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("exampleFull")}</span>
              <Badge variant="outline">{exampleFull}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("exampleWithDecimals")}</span>
              <Badge variant="outline">{exampleWithDecimals}</Badge>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{t("note")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
