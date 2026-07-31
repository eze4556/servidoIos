"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { XCircle, Home, RefreshCw, HelpCircle } from "lucide-react"
import Link from "next/link"
import { MultiSellerCheckoutContinue, readCheckoutSessionId } from "@/components/checkout/multi-seller-checkout-continue"
import { translateClientError } from "@/lib/i18n/translate-client-error"

export default function PurchaseFailurePage() {
  const t = useTranslations("purchase")
  const tApi = useTranslations("apiErrors")
  const searchParams = useSearchParams()
  const [failureData, setFailureData] = useState<{
    paymentId?: string
    orderId?: string
    errorMessage?: string
  }>({})
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)

  useEffect(() => {
    const paymentId = searchParams.get("payment_id")
    const orderId = searchParams.get("external_reference") || searchParams.get("purchase")
    const errorMessage = searchParams.get("error_message")
    const checkout = searchParams.get("checkout") || readCheckoutSessionId()

    if (paymentId || orderId || errorMessage) {
      setFailureData({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        errorMessage: errorMessage || undefined,
      })
    }
    setCheckoutSessionId(checkout)
  }, [searchParams])

  const displayErrorMessage = failureData.errorMessage
    ? translateClientError(
        (() => {
          try {
            return decodeURIComponent(failureData.errorMessage!)
          } catch {
            return failureData.errorMessage!
          }
        })(),
        tApi
      )
    : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t("failureTitle")}</h1>
            <p className="text-xl text-gray-600 mb-6">{t("failureSubtitle")}</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {t("failureBody")}
            </p>

            <MultiSellerCheckoutContinue sessionId={checkoutSessionId} variant="failure" />

            {failureData.paymentId && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
                <p className="text-sm text-red-700">
                  <span className="font-semibold">{t("paymentId")}</span> {failureData.paymentId}
                </p>
                {failureData.orderId && (
                  <p className="text-sm text-red-700">
                    <span className="font-semibold">{t("order")}</span> {failureData.orderId}
                  </p>
                )}
                {failureData.errorMessage && (
                  <p className="text-sm text-red-700 mt-2">
                    <span className="font-semibold">{t("error")}</span> {displayErrorMessage}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                <Link href="/">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("retryFromHome")}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  {t("backHome")}
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/contact">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  {t("needHelp")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
