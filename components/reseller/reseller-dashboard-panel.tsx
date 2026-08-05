"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { ResellerPayoutForm } from "@/components/reseller/reseller-payout-form"
import {
  RESELLER_COMMISSION_ARS,
  RESELLER_UNITS_PAYOUT_THRESHOLD,
  type ResellerStats,
} from "@/types/reseller"
import { usePriceFormat } from "@/hooks/use-price-format"
import { Loader2, TrendingUp } from "lucide-react"

export function ResellerDashboardPanel() {
  const t = useTranslations("resellerProgram")
  const { formatPriceNumber } = usePriceFormat()
  const { currentUser } = useAuth()
  const uid = currentUser?.firebaseUser?.uid
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ResellerStats | null>(null)
  const [pendingPayoutAmount, setPendingPayoutAmount] = useState(0)
  const [paidBatches, setPaidBatches] = useState(0)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      const statsSnap = await getDoc(doc(db, "resellerStats", uid))
      if (statsSnap.exists()) {
        setStats({ referrerUserId: uid, ...statsSnap.data() } as ResellerStats)
      } else {
        setStats({
          referrerUserId: uid,
          unitsInCurrentCycle: 0,
          lifetimeUnits: 0,
          lifetimePaidAmount: 0,
          totalClicks: 0,
        })
      }

      const pendingSnap = await getDocs(
        query(
          collection(db, "resellerPayoutBatches"),
          where("referrerUserId", "==", uid),
          where("status", "==", "pending_payout"),
          limit(20)
        )
      )
      let pending = 0
      pendingSnap.forEach((d) => {
        pending += Number(d.data().amount || 0)
      })
      setPendingPayoutAmount(pending)

      const paidSnap = await getDocs(
        query(
          collection(db, "resellerPayoutBatches"),
          where("referrerUserId", "==", uid),
          where("status", "==", "paid"),
          limit(5)
        )
      )
      setPaidBatches(paidSnap.size)
      setLoading(false)
    })()
  }, [uid])

  const unitsInCycle = stats?.unitsInCurrentCycle ?? 0
  const remaining = Math.max(0, RESELLER_UNITS_PAYOUT_THRESHOLD - unitsInCycle)
  const accruedInCycle = unitsInCycle * RESELLER_COMMISSION_ARS
  const progressPct = Math.min(100, (unitsInCycle / RESELLER_UNITS_PAYOUT_THRESHOLD) * 100)

  const motivator = useMemo(() => {
    if (pendingPayoutAmount > 0) return t("motivatorReadyPayout", { amount: formatPriceNumber(pendingPayoutAmount) })
    if (unitsInCycle >= RESELLER_UNITS_PAYOUT_THRESHOLD - 3 && remaining > 0) {
      return t("motivatorAlmost", { count: remaining })
    }
    if (unitsInCycle === 0) return t("motivatorStart")
    return t("motivatorProgress", {
      current: unitsInCycle,
      total: RESELLER_UNITS_PAYOUT_THRESHOLD,
      remaining,
      amount: formatPriceNumber(accruedInCycle),
    })
  }, [unitsInCycle, remaining, pendingPayoutAmount, accruedInCycle, t, formatPriceNumber])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-100 bg-gradient-to-br from-purple-50/80 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-700" />
            {t("panelTitle")}
          </CardTitle>
          <CardDescription>{t("panelSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-xl bg-white/80 p-3 text-sm font-medium text-purple-900 ring-1 ring-purple-100">
            {motivator}
          </p>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>{t("progressLabel", { current: unitsInCycle, total: RESELLER_UNITS_PAYOUT_THRESHOLD })}</span>
              <span className="text-muted-foreground">
                {remaining > 0 ? t("salesRemaining", { count: remaining }) : t("thresholdReached")}
              </span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label={t("statLifetimeSales")} value={String(stats?.lifetimeUnits ?? 0)} />
            <StatBox label={t("statClicks")} value={String(stats?.totalClicks ?? 0)} />
            <StatBox label={t("statAccrued")} value={formatPriceNumber(accruedInCycle)} />
            <StatBox label={t("statPendingPayout")} value={formatPriceNumber(pendingPayoutAmount)} />
            <StatBox label={t("statPaid")} value={formatPriceNumber(stats?.lifetimePaidAmount ?? 0)} />
            <StatBox label={t("statPaidBatches")} value={String(paidBatches)} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("commissionNote", {
              amount: formatPriceNumber(RESELLER_COMMISSION_ARS),
              threshold: RESELLER_UNITS_PAYOUT_THRESHOLD,
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("payoutDataTitle")}</CardTitle>
          <CardDescription>{t("payoutDataDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResellerPayoutForm />
        </CardContent>
      </Card>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}
