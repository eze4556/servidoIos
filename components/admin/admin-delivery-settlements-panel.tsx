"use client"

import { useCallback, useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Bike, Landmark, Loader2, Store, Wallet } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useToast } from "@/hooks/use-toast"

type CadeteRow = {
  id: string
  cadeteName?: string
  userEmail?: string
  orderCount?: number
  totalKm?: number
  amount: number
  payoutInfoSnapshot?: {
    titular?: string
    cbu?: string
    alias?: string
    banco?: string
  } | null
}

type RestaurantRow = {
  id: string
  restaurantName?: string
  orderCount?: number
  amount: number
}

type SettlementsSummary = {
  accruedCadeteAmount: number
  accruedCadeteOrders: number
  accruedKm: number
  cadeteBatchesPending: number
  cadeteToPay: number
  pendingCashCommission: number
  pendingCashOrders: number
  restaurantBatchesPending: number
  restaurantToCollect: number
}

export function AdminDeliverySettlementsPanel() {
  const t = useTranslations("adminDashboard.deliverySettlements")
  const { formatPriceNumber } = usePriceFormat()
  const { toast } = useToast()
  const [loadingCadetes, setLoadingCadetes] = useState(true)
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [generating, setGenerating] = useState<"cadetes" | "restaurants" | null>(null)
  const [marking, setMarking] = useState<string | null>(null)
  const [cadetes, setCadetes] = useState<CadeteRow[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [summary, setSummary] = useState<SettlementsSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  const authHeaders = async () => {
    const user = auth.currentUser
    if (!user) throw new Error("no-auth")
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  }

  const loadSummary = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setLoadingSummary(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/delivery-settlements/summary", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setSummary(data)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const loadCadetes = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setLoadingCadetes(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/cadete-payouts?status=pending_payout", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setCadetes(data.batches || [])
    } finally {
      setLoadingCadetes(false)
    }
  }, [])

  const loadRestaurants = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setLoadingRestaurants(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/restaurant-commissions?status=pending_collection", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRestaurants(data.batches || [])
    } finally {
      setLoadingRestaurants(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
    void loadCadetes()
    void loadRestaurants()
  }, [loadSummary, loadCadetes, loadRestaurants])

  const generateCadetes = async () => {
    setGenerating("cadetes")
    try {
      const res = await fetch("/api/admin/cadete-payouts", {
        method: "POST",
        headers: await authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({
        title: t("generatedCadetes", { count: data.created?.length || 0 }),
      })
      await loadCadetes()
      await loadSummary()
    } catch {
      toast({ title: t("error"), variant: "destructive" })
    } finally {
      setGenerating(null)
    }
  }

  const generateRestaurants = async () => {
    setGenerating("restaurants")
    try {
      const res = await fetch("/api/admin/restaurant-commissions", {
        method: "POST",
        headers: await authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({
        title: t("generatedRestaurants", { count: data.created?.length || 0 }),
      })
      await loadRestaurants()
      await loadSummary()
    } catch {
      toast({ title: t("error"), variant: "destructive" })
    } finally {
      setGenerating(null)
    }
  }

  const markCadetePaid = async (batchId: string) => {
    setMarking(batchId)
    try {
      const res = await fetch("/api/admin/cadete-payouts", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ batchId }),
      })
      if (!res.ok) throw new Error("fail")
      toast({ title: t("markedPaid") })
      await loadCadetes()
      await loadSummary()
    } catch {
      toast({ title: t("error"), variant: "destructive" })
    } finally {
      setMarking(null)
    }
  }

  const markRestaurantPaid = async (batchId: string) => {
    setMarking(batchId)
    try {
      const res = await fetch("/api/admin/restaurant-commissions", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ batchId }),
      })
      if (!res.ok) throw new Error("fail")
      toast({ title: t("markedCollected") })
      await loadRestaurants()
      await loadSummary()
    } catch {
      toast({ title: t("error"), variant: "destructive" })
    } finally {
      setMarking(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("reportTitle")}</CardTitle>
          <CardDescription>{t("reportDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Bike className="h-4 w-4" />
                  {t("toPayCadetes")}
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatPriceNumber(summary?.cadeteToPay ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("toPayCadetesHint", { count: summary?.cadeteBatchesPending ?? 0 })}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Store className="h-4 w-4" />
                  {t("toCollectRestaurants")}
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatPriceNumber(summary?.restaurantToCollect ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("toCollectRestaurantsHint", { count: summary?.restaurantBatchesPending ?? 0 })}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  {t("accruedCadetes")}
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatPriceNumber(summary?.accruedCadeteAmount ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("accruedCadetesHint", {
                    orders: summary?.accruedCadeteOrders ?? 0,
                    km: (summary?.accruedKm ?? 0).toFixed(1),
                  })}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Landmark className="h-4 w-4" />
                  {t("pendingCash")}
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatPriceNumber(summary?.pendingCashCommission ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("pendingCashHint", { orders: summary?.pendingCashOrders ?? 0 })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("cadetesTitle")}</CardTitle>
            <CardDescription>{t("cadetesDesc")}</CardDescription>
          </div>
          <Button onClick={() => void generateCadetes()} disabled={generating === "cadetes"}>
            {generating === "cadetes" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("generateCadetes")}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingCadetes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : cadetes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("cadetesEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCadete")}</TableHead>
                  <TableHead>{t("colBank")}</TableHead>
                  <TableHead>{t("colOrders")}</TableHead>
                  <TableHead>{t("colAmount")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cadetes.map((b) => {
                  const p = b.payoutInfoSnapshot
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{p?.titular || b.cadeteName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{b.userEmail}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p?.alias && <div>Alias: {p.alias}</div>}
                        {p?.cbu && <div>CBU: {p.cbu}</div>}
                        {p?.banco && <div>{p.banco}</div>}
                        {!p?.alias && !p?.cbu && <div className="text-amber-700">{t("missingBank")}</div>}
                      </TableCell>
                      <TableCell>
                        {b.orderCount || 0}
                        {typeof b.totalKm === "number" ? ` · ${b.totalKm.toFixed(1)} km` : ""}
                      </TableCell>
                      <TableCell>{formatPriceNumber(b.amount)}</TableCell>
                      <TableCell>
                        <Button size="sm" disabled={marking === b.id} onClick={() => void markCadetePaid(b.id)}>
                          {marking === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("markPaid")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("restaurantsTitle")}</CardTitle>
            <CardDescription>{t("restaurantsDesc")}</CardDescription>
          </div>
          <Button onClick={() => void generateRestaurants()} disabled={generating === "restaurants"}>
            {generating === "restaurants" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("generateRestaurants")
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingRestaurants ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : restaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("restaurantsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colRestaurant")}</TableHead>
                  <TableHead>{t("colOrders")}</TableHead>
                  <TableHead>{t("colAmount")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.restaurantName || "—"}</TableCell>
                    <TableCell>{b.orderCount || 0}</TableCell>
                    <TableCell>{formatPriceNumber(b.amount)}</TableCell>
                    <TableCell>
                      <Button size="sm" disabled={marking === b.id} onClick={() => void markRestaurantPaid(b.id)}>
                        {marking === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("markCollected")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
