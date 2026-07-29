"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Home, Package, RefreshCw } from "lucide-react"
import Link from "next/link"
import { MultiSellerCheckoutContinue, readCheckoutSessionId } from "@/components/checkout/multi-seller-checkout-continue"

export default function PurchasePendingPage() {
  const t = useTranslations("purchase")
  const searchParams = useSearchParams()
  const [pendingData, setPendingData] = useState<{
    paymentId?: string
    orderId?: string
    amount?: string
  }>({})
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)

  useEffect(() => {
    const paymentId = searchParams.get("payment_id")
    const orderId = searchParams.get("external_reference") || searchParams.get("purchase")
    const amount = searchParams.get("transaction_amount")
    const checkout = searchParams.get("checkout") || readCheckoutSessionId()

    if (paymentId || orderId || amount) {
      setPendingData({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        amount: amount || undefined,
      })
    }
    setCheckoutSessionId(checkout)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Clock className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t("pendingTitle")}</h1>
            <p className="text-xl text-gray-600 mb-6">{t("pendingSubtitle")}</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {t("pendingBody")}
            </p>

            <MultiSellerCheckoutContinue sessionId={checkoutSessionId} variant="pending" />

            {pendingData.paymentId && (
              <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">{t("paymentId")}</span> {pendingData.paymentId}
                </p>
                {pendingData.orderId && (
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">{t("order")}</span> {pendingData.orderId}
                  </p>
                )}
                {pendingData.amount && (
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">{t("amount")}</span> ${pendingData.amount}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button asChild className="w-full bg-yellow-600 hover:bg-yellow-700">
                <Link href="/dashboard/buyer">
                  <Package className="w-4 h-4 mr-2" />
                  {t("viewPurchases")}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  {t("backHome")}
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/dashboard/buyer">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("refreshStatus")}
                </Link>
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-6">
              {t("pendingSupport")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
