"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { RESELLER_COMMISSION_ARS } from "@/types/reseller"
import { usePriceFormat } from "@/hooks/use-price-format"

type ProductRow = {
  productId: string
  name: string
  allowResellerShare: boolean
  links: number
  clicks: number
  unitsSold: number
}

type SellerResellerProgramPanelProps = {
  sellerId: string
  products: { id: string; name: string; allowResellerShare?: boolean; isService?: boolean }[]
}

export function SellerResellerProgramPanel({ sellerId, products }: SellerResellerProgramPanelProps) {
  const t = useTranslations("sellerDashboard.resellerProgram")
  const { formatPriceNumber } = usePriceFormat()
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<
    { productId: string; clickCount: number }[]
  >([])
  const [sales, setSales] = useState<{ productId: string; quantity: number }[]>([])

  useEffect(() => {
    if (!sellerId) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      try {
        const [linksSnap, salesSnap] = await Promise.all([
          getDocs(query(collection(db, "resellerLinks"), where("sellerId", "==", sellerId))),
          getDocs(query(collection(db, "resellerSales"), where("sellerId", "==", sellerId))),
        ])
        setLinks(
          linksSnap.docs.map((d) => ({
            productId: String(d.data().productId || ""),
            clickCount: Number(d.data().clickCount || 0),
          }))
        )
        setSales(
          salesSnap.docs.map((d) => ({
            productId: String(d.data().productId || ""),
            quantity: Number(d.data().quantity || 0),
          }))
        )
      } catch (err) {
        console.error("seller reseller metrics", err)
        setLinks([])
        setSales([])
      } finally {
        setLoading(false)
      }
    })()
  }, [sellerId])

  const rows = useMemo((): ProductRow[] => {
    const physical = products.filter((p) => !p.isService)
    return physical.map((p) => {
      const productLinks = links.filter((l) => l.productId === p.id)
      const productSales = sales.filter((s) => s.productId === p.id)
      return {
        productId: p.id,
        name: p.name,
        allowResellerShare: Boolean(p.allowResellerShare),
        links: productLinks.length,
        clicks: productLinks.reduce((sum, l) => sum + l.clickCount, 0),
        unitsSold: productSales.reduce((sum, s) => sum + s.quantity, 0),
      }
    })
  }, [products, links, sales])

  const totals = useMemo(() => {
    const enabled = rows.filter((r) => r.allowResellerShare).length
    const clicks = rows.reduce((s, r) => s + r.clicks, 0)
    const units = rows.reduce((s, r) => s + r.unitsSold, 0)
    const platformCommission = units * RESELLER_COMMISSION_ARS
    return { enabled, clicks, units, platformCommission }
  }, [rows])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-700" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("statEnabled")} value={String(totals.enabled)} />
          <Stat label={t("statClicks")} value={String(totals.clicks)} />
          <Stat label={t("statUnitsSold")} value={String(totals.units)} />
          <Stat label={t("statServidoCommission")} value={formatPriceNumber(totals.platformCommission)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tableTitle")}</CardTitle>
          <CardDescription>{t("tableDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colProduct")}</TableHead>
                <TableHead>{t("colProgram")}</TableHead>
                <TableHead>{t("colLinks")}</TableHead>
                <TableHead>{t("colClicks")}</TableHead>
                <TableHead>{t("colSales")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      {row.allowResellerShare ? (
                        <span className="text-emerald-700">{t("active")}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("inactive")}</span>
                      )}
                    </TableCell>
                    <TableCell>{row.links}</TableCell>
                    <TableCell>{row.clicks}</TableCell>
                    <TableCell>{row.unitsSold}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}
