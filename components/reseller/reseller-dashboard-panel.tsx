"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { ResellerPayoutForm } from "@/components/reseller/reseller-payout-form"
import {
  RESELLER_COMMISSION_ARS,
  RESELLER_UNITS_PAYOUT_THRESHOLD,
  type ResellerStats,
} from "@/types/reseller"
import {
  loadResellerLinks,
  loadResellerPayoutBatches,
  loadResellerSales,
  type ResellerBatchRow,
  type ResellerLinkRow,
  type ResellerSaleRow,
} from "@/lib/reseller/reseller-dashboard-data"
import { productUrlWithRef } from "@/lib/reseller/attribution-storage"
import { copyTextToClipboard } from "@/lib/copy-to-clipboard"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useToast } from "@/components/ui/use-toast"
import { Copy, ExternalLink, Loader2, Link2, Receipt, TrendingUp, Wallet } from "lucide-react"

export function ResellerDashboardPanel() {
  const t = useTranslations("resellerProgram")
  const { formatPriceNumber } = usePriceFormat()
  const { toast } = useToast()
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const { currentUser } = useAuth()
  const uid = currentUser?.firebaseUser?.uid
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ResellerStats | null>(null)
  const [pendingPayoutAmount, setPendingPayoutAmount] = useState(0)
  const [paidBatchesCount, setPaidBatchesCount] = useState(0)
  const [sales, setSales] = useState<ResellerSaleRow[]>([])
  const [links, setLinks] = useState<ResellerLinkRow[]>([])
  const [batches, setBatches] = useState<ResellerBatchRow[]>([])

  const loadAll = useCallback(async () => {
    if (!uid) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
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

      const [salesRows, linkRows, batchRows] = await Promise.all([
        loadResellerSales(uid),
        loadResellerLinks(uid),
        loadResellerPayoutBatches(uid),
      ])
      setSales(salesRows)
      setLinks(linkRows)
      setBatches(batchRows)

      let pending = 0
      let paidCount = 0
      batchRows.forEach((b) => {
        if (b.status === "pending_payout") pending += b.amount
        if (b.status === "paid") paidCount += 1
      })
      setPendingPayoutAmount(pending)
      setPaidBatchesCount(paidCount)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

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

  const formatDate = (d: Date | null) => {
    if (!d) return "—"
    return d.toLocaleString(dateLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const copyProductLink = async (productId: string, code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = productUrlWithRef(origin, productId, code)
    const ok = await copyTextToClipboard(url)
    toast({
      title: ok ? t("linkCopied") : t("error"),
      description: ok ? undefined : t("copyFailed"),
      variant: ok ? "default" : "destructive",
    })
  }

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatBox label={t("statLifetimeSales")} value={String(stats?.lifetimeUnits ?? 0)} />
            <StatBox label={t("statClicks")} value={String(stats?.totalClicks ?? 0)} />
            <StatBox label={t("statAccrued")} value={formatPriceNumber(accruedInCycle)} />
            <StatBox label={t("statPendingPayout")} value={formatPriceNumber(pendingPayoutAmount)} />
            <StatBox label={t("statPaid")} value={formatPriceNumber(stats?.lifetimePaidAmount ?? 0)} />
            <StatBox label={t("statPaidBatches")} value={String(paidBatchesCount)} />
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-purple-700" />
            {t("salesSectionTitle")}
          </CardTitle>
          <CardDescription>{t("salesSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("salesEmpty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colProduct")}</TableHead>
                    <TableHead className="text-right">{t("colUnits")}</TableHead>
                    <TableHead className="text-right">{t("colCommission")}</TableHead>
                    <TableHead>{t("colDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right">{formatPriceNumber(row.commissionTotal)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-purple-700" />
            {t("linksSectionTitle")}
          </CardTitle>
          <CardDescription>{t("linksSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("linksEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {links.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{row.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("linkClicks", { count: row.clickCount })}
                      {!row.active && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {t("linkInactive")}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => void copyProductLink(row.productId, row.code)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t("copyLink")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="gap-1" asChild>
                      <a
                        href={productUrlWithRef(
                          typeof window !== "undefined" ? window.location.origin : "",
                          row.productId,
                          row.code
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("openProduct")}
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-purple-700" />
            {t("payoutsSectionTitle")}
          </CardTitle>
          <CardDescription>{t("payoutsSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("payoutsEmpty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colStatus")}</TableHead>
                    <TableHead className="text-right">{t("colUnits")}</TableHead>
                    <TableHead className="text-right">{t("colAmount")}</TableHead>
                    <TableHead>{t("colCreated")}</TableHead>
                    <TableHead>{t("colPaidAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge
                          variant={row.status === "paid" ? "default" : "secondary"}
                          className={row.status === "paid" ? "bg-emerald-600" : "bg-amber-100 text-amber-900"}
                        >
                          {row.status === "paid" ? t("statusPaid") : t("statusPending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.units}</TableCell>
                      <TableCell className="text-right font-medium">{formatPriceNumber(row.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.paidAt
                          ? new Date(row.paidAt).toLocaleString(dateLocale, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("payoutDataTitle")}</CardTitle>
          <CardDescription>{t("payoutDataDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResellerPayoutForm onSaved={() => void loadAll()} />
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
