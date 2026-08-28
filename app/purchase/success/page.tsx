"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { CheckCircle, Home, Package } from "lucide-react"
import Link from "next/link"
import { MultiSellerCheckoutContinue, readCheckoutSessionId } from "@/components/checkout/multi-seller-checkout-continue"
import { PurchaseResultShell } from "@/components/checkout/purchase-result-shell"

export default function PurchaseSuccessPage() {
  const t = useTranslations("purchase")
  const searchParams = useSearchParams()
  const [purchaseData, setPurchaseData] = useState<{
    paymentId?: string
    orderId?: string
    amount?: string
  }>({})
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)
  const [currentPurchaseId, setCurrentPurchaseId] = useState<string | null>(null)

  useEffect(() => {
    const paymentId = searchParams.get("payment_id")
    const orderId = searchParams.get("external_reference") || searchParams.get("purchase")
    const amount = searchParams.get("transaction_amount")
    const checkout = searchParams.get("checkout") || readCheckoutSessionId()

    if (paymentId || orderId || amount) {
      setPurchaseData({
        paymentId: paymentId || undefined,
        orderId: orderId || undefined,
        amount: amount || undefined,
      })
    }
    setCheckoutSessionId(checkout)
    setCurrentPurchaseId(orderId)
  }, [searchParams])

  return (
    <PurchaseResultShell
      tone="success"
      icon={CheckCircle}
      title={t("successTitle")}
      subtitle={t("successSubtitle")}
      body={t("successBody")}
      footnote={t("emailConfirm")}
    >
      <MultiSellerCheckoutContinue
        sessionId={checkoutSessionId}
        currentPurchaseId={currentPurchaseId}
        variant="success"
      />

      {purchaseData.paymentId && (
        <div className="mb-6 space-y-1 rounded-2xl bg-slate-50 p-4 ring-1 ring-servido-950/5">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-servido-950">{t("paymentId")}</span>{" "}
            {purchaseData.paymentId}
          </p>
          {purchaseData.orderId && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-servido-950">{t("order")}</span>{" "}
              {purchaseData.orderId}
            </p>
          )}
          {purchaseData.amount && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-servido-950">{t("amount")}</span> $
              {purchaseData.amount}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Button
          asChild
          className="w-full rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
        >
          <Link href="/dashboard/buyer">
            <Package className="mr-2 h-4 w-4" />
            {t("viewPurchases")}
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
      </div>
    </PurchaseResultShell>
  )
}
