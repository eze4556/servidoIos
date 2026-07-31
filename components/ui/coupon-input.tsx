"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Tag, X, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Coupon {
  id: string
  code: string
  name: string
  description?: string | null
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  usedCount?: number
  applicableTo: "all" | "sellers" | "buyers"
  sellerId?: string | null
  startDate?: any | null
  endDate?: any | null
  isActive: boolean
  createdAt: any
}

interface CouponInputProps {
  onCouponApplied?: (coupon: Coupon) => void
  onCouponRemoved?: () => void
  appliedCoupon?: Coupon | null
  subtotal: number
  className?: string
  items?: Array<{ sellerId: string; id: string; name: string }>
}

const SAMPLE_COUPONS: Coupon[] = [
  {
    id: "1",
    code: "DESCUENTO20",
    name: "Descuento del 20%",
    description: "Descuento del 20% en toda la compra",
    discountType: "percentage",
    discountValue: 20,
    minPurchase: 1000,
    maxDiscount: 500,
    usageLimit: 100,
    usedCount: 50,
    applicableTo: "buyers",
    sellerId: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "2",
    code: "FIXED50",
    name: "Descuento fijo $50",
    description: "Descuento fijo de $50 en compras mayores a $500",
    discountType: "fixed",
    discountValue: 50,
    minPurchase: 500,
    maxDiscount: null,
    usageLimit: 50,
    usedCount: 25,
    applicableTo: "buyers",
    sellerId: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "3",
    code: "BIENVENIDA10",
    name: "Cupón de bienvenida 10%",
    description: "10% de descuento para nuevos usuarios",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 100,
    maxDiscount: 200,
    usageLimit: 1000,
    usedCount: 300,
    applicableTo: "buyers",
    sellerId: null,
    isActive: true,
    createdAt: new Date(),
  },
]

export function CouponInput({
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
  subtotal,
  className = "",
  items = [],
}: CouponInputProps) {
  const t = useTranslations("coupons")
  const tc = useTranslations("cart")
  const locale = useLocale()
  const numberLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const validateCoupon = (code: string): Coupon | null => {
    const coupon = SAMPLE_COUPONS.find((c) => c.code === code.toUpperCase())
    return coupon || null
  }

  const formatDiscountLabel = (coupon: Coupon) => {
    if (coupon.discountType === "percentage") {
      return t("discountPercent", { value: coupon.discountValue })
    }
    return t("discountFixed", { value: coupon.discountValue })
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError(t("enterCode"))
      return
    }

    if (items.length > 0) {
      const firstSellerId = items[0].sellerId
      const allSameSeller = items.every((item) => item.sellerId === firstSellerId)

      if (!allSameSeller) {
        setError(t("sameSellerError"))
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const coupon = validateCoupon(couponCode.trim().toUpperCase())

      if (!coupon) {
        setError(t("notFound"))
        return
      }

      if (!coupon.isActive) {
        setError(t("inactive"))
        return
      }

      if (items.length > 0 && coupon.sellerId) {
        const firstSellerId = items[0].sellerId
        if (coupon.sellerId !== firstSellerId) {
          setError(t("wrongSeller"))
          return
        }
      }

      const now = new Date()
      if (coupon.startDate) {
        const startDate = coupon.startDate.toDate ? coupon.startDate.toDate() : new Date(coupon.startDate)
        if (startDate > now) {
          setError(t("notYetAvailable"))
          return
        }
      }
      if (coupon.endDate) {
        const endDate = coupon.endDate.toDate ? coupon.endDate.toDate() : new Date(coupon.endDate)
        if (endDate < now) {
          setError(t("expired"))
          return
        }
      }

      if (coupon.minPurchase && subtotal < coupon.minPurchase) {
        setError(
          t("minPurchase", {
            amount: coupon.minPurchase.toLocaleString(numberLocale),
          })
        )
        return
      }

      if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
        setError(t("usageLimit"))
        return
      }

      onCouponApplied?.(coupon)
      setCouponCode("")

      toast({
        title: t("appliedTitle"),
        description: t("appliedDesc", {
          name: coupon.name,
          discount: formatDiscountLabel(coupon),
        }),
        duration: 3000,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("applyError")
      setError(errorMessage)
      toast({
        title: tc("error"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    onCouponRemoved?.()
    toast({
      title: t("removedTitle"),
      description: t("removedDesc"),
      duration: 2000,
    })
  }

  const calculateDiscount = (coupon: Coupon, total: number): number => {
    if (coupon.discountType === "percentage") {
      const discount = total * (coupon.discountValue / 100)
      return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount
    }
    return Math.min(coupon.discountValue, total)
  }

  const discountAmount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal) : 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
          {items.length > 0 && <span className="mt-1 block text-xs text-gray-500">💡 {t("sameSellerHint")}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appliedCoupon ? (
          <div className="space-y-3">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{appliedCoupon.name}</strong>
                    {appliedCoupon.description && (
                      <p className="text-sm text-green-700">{appliedCoupon.description}</p>
                    )}
                    {appliedCoupon.sellerId && (
                      <p className="text-xs text-green-600">{t("sellerSpecific")}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {appliedCoupon.discountType === "percentage"
                      ? t("offPercent", { value: appliedCoupon.discountValue })
                      : t("offFixed", { value: appliedCoupon.discountValue })}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-medium">{t("discountApplied")}</span>
              <span className="font-bold text-green-600">
                -{discountAmount.toLocaleString(numberLocale, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={handleRemoveCoupon} className="w-full">
              <X className="mr-2 h-4 w-4" />
              {t("remove")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="coupon-code" className="sr-only">
                  {t("codeLabel")}
                </Label>
                <Input
                  id="coupon-code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t("codePlaceholder")}
                  className="uppercase"
                  disabled={loading}
                />
              </div>
              <Button onClick={handleApplyCoupon} disabled={loading || !couponCode.trim()} className="shrink-0">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("applying")}
                  </>
                ) : (
                  t("apply")
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-gray-500">
              <p>• {t("ruleSingleUse")}</p>
              <p>• {t("ruleMinPurchase")}</p>
              <p>• {t("ruleBeforeTax")}</p>
              {items.length > 0 && <p>• {t("ruleSameSeller")}</p>}
              <p className="mt-2 font-medium">{t("examples")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
