"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Users, Calculator, DollarSign, Truck } from "lucide-react"
import { getCartPurchaseSummary } from "@/lib/centralized-payments-api"
import { usePriceFormat } from "@/hooks/use-price-format"

interface PurchaseSummaryProps {
  cartItems: Array<{
    id: string
    name: string
    price: number
    discountedPrice: number
    quantity: number
    sellerId: string
    freeShipping?: boolean
    shippingCost?: number
  }>
  className?: string
}

export function PurchaseSummary({ cartItems, className = "" }: PurchaseSummaryProps) {
  const t = useTranslations("purchaseSummaryCard")
  const { formatPriceNumber } = usePriceFormat()
  const summary = getCartPurchaseSummary(cartItems)

  const totalShipping = cartItems.reduce((total, item) => {
    if (item.freeShipping) {
      return total
    }

    if (item.shippingCost !== undefined && item.shippingCost > 0) {
      return total + item.shippingCost
    }

    return total
  }, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">{t("productsCount", { count: summary.totalItems })}</p>
              <p className="text-xs text-gray-500">{t("itemsTotal")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">{t("vendorsCount", { count: summary.totalVendors })}</p>
              <p className="text-xs text-gray-500">{t("differentStores")}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t("vendorBreakdown")}</h4>
          {summary.vendorBreakdown.map((vendor: any, index: number) => (
            <div key={vendor.vendorId} className="rounded-lg bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t("vendorN", { n: index + 1 })}</Badge>
                  <span className="text-sm">{t("items", { count: vendor.itemCount })}</span>
                </div>
                <span className="font-medium">{formatPriceNumber(vendor.subtotal)}</span>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>{t("subtotal")}</span>
                  <span>{formatPriceNumber(vendor.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("commissionLine")}</span>
                  <span>-{formatPriceNumber(vendor.commission)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-600">
                  <span>{t("sellerNet")}</span>
                  <span>{formatPriceNumber(vendor.netAmount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("subtotal")}</span>
            <span className="font-medium">{formatPriceNumber(summary.subtotal)}</span>
          </div>

          {totalShipping > 0 && (
            <div className="flex items-center justify-between text-blue-600">
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                <span className="text-sm">{t("shipping")}</span>
              </div>
              <span className="font-medium">{formatPriceNumber(totalShipping)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-purple-600">
            <div className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              <span className="text-sm">{t("totalCommission")}</span>
            </div>
            <span className="font-medium">{formatPriceNumber(summary.commission)}</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-lg font-bold">
            <div className="flex items-center gap-1">
              <DollarSign className="h-5 w-5" />
              <span>{t("totalToPay")}</span>
            </div>
            <span>{formatPriceNumber(summary.total + totalShipping)}</span>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-800">
            <strong>{t("splitInfo")}</strong> {t("splitBody")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
