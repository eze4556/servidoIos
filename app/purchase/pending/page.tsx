"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Clock, Home, Package, RefreshCw } from "lucide-react"
import Link from "next/link"
import { MultiSellerCheckoutContinue, readCheckoutSessionId } from "@/components/checkout/multi-seller-checkout-continue"
import { PurchaseResultShell } from "@/components/checkout/purchase-result-shell"

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
    <PurchaseResultShell
      tone="pending"
      icon={Clock}
      pulseIcon
      title={t("pendingTitle")}
      subtitle={t("pendingSubtitle")}
      body={t("pendingBody")}
      footnote={t("pendingSupport")}
    >
      <MultiSellerCheckoutContinue sessionId={checkoutSessionId} variant="pending" />

      {pendingData.paymentId && (
        <div className="mb-6 space-y-1 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/70">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">{t("paymentId")}</span> {pendingData.paymentId}
          </p>
          {pendingData.orderId && (
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{t("order")}</span> {pendingData.orderId}
            </p>
          )}
          {pendingData.amount && (
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{t("amount")}</span> ${pendingData.amount}
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

        <Button asChild variant="ghost" className="w-full rounded-full text-slate-600">
          <Link href="/dashboard/buyer">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("refreshStatus")}
          </Link>
        </Button>
      </div>
    </PurchaseResultShell>
  )
}
