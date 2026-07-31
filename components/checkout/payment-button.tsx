"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { PaymentItem } from "@/types/payments"
import { ApiService } from "@/lib/services/api"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useTranslations } from "next-intl"

interface PaymentButtonProps {
  items: PaymentItem[]
  sellerId?: string
  className?: string
}

export function PaymentButton({ items, sellerId, className = "" }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const { formatPriceNumber } = usePriceFormat()
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const t = useTranslations("cart")

  const handlePayment = async () => {
    if (!currentUser) {
      toast({
        title: t("error"),
        description: t("loginRequired"),
        variant: "destructive",
      })
      return
    }

    if (!items || items.length === 0) {
      toast({
        title: t("error"),
        description: t("noProductsCheckout"),
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const products = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }))

      const totalShippingCost = items.reduce((total, item) => {
        if (item.freeShipping) return total
        if (item.shippingCost !== undefined && item.shippingCost > 0) {
          return total + item.shippingCost
        }
        return total
      }, 0)

      const response = await ApiService.createProductPreference({
        products,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || "",
        shippingCost: totalShippingCost,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error(t("paymentStartMissing"))
      }

      const totalProducts = items.length
      const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      const itemsLabel = totalProducts === 1 ? t("product") : t("products")

      toast({
        title: `✅ ${t("purchaseCreatedToast")}`,
        description: t("purchaseCreatedMultiLine", {
          count: totalProducts,
          itemsLabel,
          price: formatPriceNumber(totalAmount),
        }),
        duration: 3000,
      })

      window.location.href = response.data.init_point
    } catch (error) {
      console.error("Error al procesar el pago:", error)
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("paymentError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePayment} className={className} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("processing")}
        </>
      ) : (
        t("pay")
      )}
    </Button>
  )
}
