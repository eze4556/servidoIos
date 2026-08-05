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
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useToast } from "@/hooks/use-toast"

type BatchRow = {
  id: string
  referrerUserId: string
  units: number
  amount: number
  status: string
  userEmail?: string
  userName?: string
  payoutInfoSnapshot?: {
    titular?: string
    cbu?: string
    alias?: string
    banco?: string
    dni?: string
  } | null
}

export function AdminResellerPayoutsPanel() {
  const t = useTranslations("resellerProgram.admin")
  const { formatPriceNumber } = usePriceFormat()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [marking, setMarking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    setLoading(true)
    const token = await user.getIdToken()
    const res = await fetch("/api/admin/reseller-payouts?status=pending_payout", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setBatches(data.batches || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markPaid = async (batchId: string) => {
    const user = auth.currentUser
    if (!user) return
    setMarking(batchId)
    const token = await user.getIdToken()
    const res = await fetch("/api/admin/reseller-payouts", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchId }),
    })
    setMarking(null)
    if (!res.ok) {
      toast({ title: t("error"), variant: "destructive" })
      return
    }
    toast({ title: t("markedPaid") })
    void load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colReseller")}</TableHead>
                <TableHead>{t("colBank")}</TableHead>
                <TableHead>{t("colUnits")}</TableHead>
                <TableHead>{t("colAmount")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const p = b.payoutInfoSnapshot
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{p?.titular || b.userName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{b.userEmail}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p?.alias && <div>Alias: {p.alias}</div>}
                      {p?.cbu && <div>CBU: {p.cbu}</div>}
                      {p?.banco && <div>{p.banco}</div>}
                      {p?.dni && <div>DNI: {p.dni}</div>}
                    </TableCell>
                    <TableCell>{b.units}</TableCell>
                    <TableCell>{formatPriceNumber(b.amount)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={marking === b.id}
                        onClick={() => void markPaid(b.id)}
                      >
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
  )
}
