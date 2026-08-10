"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Plus, Car } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { VehicleListingForm } from "@/components/vehicles/vehicle-listing-form"
import { fetchSellerVehicleListings, updateVehicleListing } from "@/lib/vehicles/vehicle-listings"
import { formatVehiclePrice } from "@/lib/vehicles/format-vehicle-price"
import type { VehicleListing, VehicleListingStatus } from "@/types/vehicle-listing"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"

export default function SellerVehiclesPage() {
  const t = useTranslations("vehicles")
  const locale = useLocale()
  const { currentUser } = useAuth()
  const uid = currentUser?.firebaseUser?.uid
  const displayName =
    currentUser?.displayName ||
    currentUser?.businessName ||
    currentUser?.email ||
    "Vendedor"

  const [listings, setListings] = useState<VehicleListing[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleListing | null>(null)

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const rows = await fetchSellerVehicleListings(uid)
      setListings(rows)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (listing: VehicleListing, status: VehicleListingStatus) => {
    if (!uid) return
    try {
      await updateVehicleListing(listing.id, uid, { status })
      await load()
    } catch {
      // limit etc.
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-4xl space-y-4 overflow-x-hidden bg-slate-50 px-3 py-4 pb-[max(5rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:px-4 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit max-w-full">
        <Link href="/dashboard/seller">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToSeller")}
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-2xl">
              <Car className="h-5 w-5 text-servido-800" />
              {t("sellerPanelTitle")}
            </CardTitle>
            <CardDescription>{t("sellerPanelDesc")}</CardDescription>
            <p className="mt-2 text-sm font-medium text-emerald-700">{t("publishFreeNote")}</p>
          </div>
          <Button
            className="h-11 w-full shrink-0 bg-servido-800 hover:bg-servido-900 sm:w-auto"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("publishCta")}
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
            </div>
          ) : listings.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t("sellerEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {listings.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{row.title}</p>
                    <p className="text-sm text-servido-800">
                      {formatVehiclePrice(row.price, row.priceCurrency, locale)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {t(`status.${row.status}`)}
                    </Badge>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                    <Button asChild size="sm" variant="outline" className="h-9 min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                      <Link href={`/autos/${row.id}`}>{t("viewPublic")}</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                      onClick={() => {
                        setEditing(row)
                        setFormOpen(true)
                      }}
                    >
                      {t("editListing")}
                    </Button>
                    {row.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                        onClick={() => void setStatus(row, "paused")}
                      >
                        {t("pauseListing")}
                      </Button>
                    )}
                    {row.status === "paused" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                        onClick={() => void setStatus(row, "active")}
                      >
                        {t("resumeListing")}
                      </Button>
                    )}
                    {row.status !== "sold" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="col-span-2 h-9 sm:col-span-1"
                        onClick={() => void setStatus(row, "sold")}
                      >
                        {t("markSold")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className={cn(
            "flex h-[100dvh] w-full max-w-[100vw] flex-col gap-0 overflow-hidden rounded-none border-0 p-0",
            "left-0 top-0 translate-x-0 translate-y-0",
            "sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6 sm:gap-4"
          )}
        >
          <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left sm:border-0 sm:px-0 sm:py-0">
            <DialogTitle className="text-base leading-snug sm:text-lg">
              {editing ? t("editListing") : t("publishCta")}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0 sm:py-0">
          {uid && (
            <VehicleListingForm
              sellerId={uid}
              sellerDisplayName={displayName}
              listingId={editing?.id}
              initial={editing ?? undefined}
              onSuccess={() => {
                setFormOpen(false)
                setEditing(null)
                void load()
              }}
              onCancel={() => {
                setFormOpen(false)
                setEditing(null)
              }}
            />
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
