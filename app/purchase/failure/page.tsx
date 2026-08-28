"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { XCircle, Home, RefreshCw, HelpCircle } from "lucide-react"
import Link from "next/link"
import { MultiSellerCheckoutContinue, readCheckoutSessionId } from "@/components/checkout/multi-seller-checkout-continue"
import { PurchaseResultShell } from "@/components/checkout/purchase-result-shell"
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
    <PurchaseResultShell
      tone="failure"
      icon={XCircle}
      title={t("failureTitle")}
      subtitle={t("failureSubtitle")}
      body={t("failureBody")}
    >
      <MultiSellerCheckoutContinue sessionId={checkoutSessionId} variant="failure" />

      {failureData.paymentId && (
        <div className="mb-6 space-y-1 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200/70">
          <p className="text-sm text-red-800">
            <span className="font-semibold">{t("paymentId")}</span> {failureData.paymentId}
          </p>
          {failureData.orderId && (
            <p className="text-sm text-red-800">
              <span className="font-semibold">{t("order")}</span> {failureData.orderId}
            </p>
          )}
          {failureData.errorMessage && (
            <p className="mt-2 text-sm text-red-800">
              <span className="font-semibold">{t("error")}</span> {displayErrorMessage}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Button
          asChild
          className="w-full rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
        >
          <Link href="/">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("retryFromHome")}
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full rounded-full border-servido-200 text-servido-900 hover:bg-servido-50"
        >
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            {t("backHome")}
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full rounded-full text-slate-600">
          <Link href="/contact">
            <HelpCircle className="mr-2 h-4 w-4" />
            {t("needHelp")}
          </Link>
        </Button>
      </div>
    </PurchaseResultShell>
  )
}
