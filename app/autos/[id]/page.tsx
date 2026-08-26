"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, ArrowLeft, MessageCircle, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { VehicleDetailGallery } from "@/components/vehicles/vehicle-detail-gallery"
import { VehicleSpecsTable } from "@/components/vehicles/vehicle-specs-table"
import { deleteVehicleListing, fetchVehicleListingById } from "@/lib/vehicles/vehicle-listings"
import { formatVehiclePrice } from "@/lib/vehicles/format-vehicle-price"
import { startVehicleListingChat } from "@/lib/chat-start"
import type { VehicleListing } from "@/types/vehicle-listing"
import { useToast } from "@/components/ui/use-toast"

export default function VehicleDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const t = useTranslations("vehicles")
  const locale = useLocale()
  const router = useRouter()
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [listing, setListing] = useState<VehicleListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [contacting, setContacting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const uid = currentUser?.firebaseUser?.uid
  const isOwner = !!uid && !!listing && uid === listing.sellerId

  useEffect(() => {
    if (!id) return
    void (async () => {
      setLoading(true)
      const data = await fetchVehicleListingById(id)
      setListing(data)
      setLoading(false)
    })()
  }, [id])

  const handleContact = async () => {
    if (!listing) return
    if (!uid) {
      router.push(`/login?redirect=/autos/${listing.id}`)
      return
    }
    if (uid === listing.sellerId) {
      toast({ title: t("chatSelfError"), variant: "destructive" })
      return
    }

    setContacting(true)
    try {
      const priceLabel = formatVehiclePrice(listing.price, listing.priceCurrency, locale)
      const initialMessage = t("chatInitialMessage", {
        title: listing.title,
        price: priceLabel,
      })
      const chatId = await startVehicleListingChat({
        listingId: listing.id,
        buyerId: uid,
        buyerName: currentUser.displayName || currentUser.email || t("chatBuyerFallback"),
        sellerId: listing.sellerId,
        sellerName: listing.sellerDisplayName,
        vehicleTitle: listing.title,
        vehicleThumbnail: listing.media?.[0]?.url,
        initialMessage,
      })
      router.push(`/chat/${chatId}`)
    } catch {
      toast({ title: t("chatError"), variant: "destructive" })
    } finally {
      setContacting(false)
    }
  }

  const handleDelete = async () => {
    if (!uid || !listing) return
    setDeleting(true)
    try {
      await deleteVehicleListing(listing.id, uid)
      router.push("/autos")
    } catch {
      toast({ title: t("deleteListingError"), variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-servido-700" />
      </div>
    )
  }

  if (!listing || (listing.status !== "active" && listing.sellerId !== uid)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-slate-500">{t("notFound")}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/autos">{t("backToCatalog")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 rounded-full text-slate-600 hover:bg-servido-50 hover:text-servido-900"
        >
          <Link href="/autos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToCatalog")}
          </Link>
        </Button>

        <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <VehicleDetailGallery media={listing.media} alt={listing.title} />

          <div className="lg:sticky lg:top-36 lg:self-start">
            <div className="space-y-6 rounded-2xl bg-white p-5 shadow-[0_24px_50px_-28px_rgba(46,16,101,0.32)] ring-1 ring-servido-950/5 sm:p-6 lg:rounded-[1.75rem] lg:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-servido-800/70">
                  {t(`vehicleType.${listing.vehicleType}`)} · {listing.year}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-servido-950 sm:text-3xl">
                  {listing.title}
                </h1>
                <p className="mt-3 text-3xl font-bold tracking-tight text-servido-800 sm:text-4xl">
                  {formatVehiclePrice(listing.price, listing.priceCurrency, locale)}
                </p>
                <p className="mt-1 text-sm text-slate-500">{listing.locationLabel}</p>
              </div>

              {isOwner && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">{t("ownerBannerTitle")}</p>
                  {listing.status !== "active" && (
                    <p className="mt-1 text-xs font-medium text-amber-800">{t(`status.${listing.status}`)}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="rounded-full border-amber-300 bg-white hover:bg-amber-100">
                      <Link href={`/dashboard/seller/vehicles?edit=${listing.id}`}>{t("editListing")}</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {t("deleteListing")}
                    </Button>
                  </div>
                </div>
              )}

              {listing.allowChat && !isOwner && (
                <Button
                  size="lg"
                  className="h-12 w-full rounded-full bg-servido-gold text-base font-semibold text-servido-950 shadow-[0_12px_28px_-12px_rgba(255,212,0,0.85)] hover:bg-[#ffe566]"
                  onClick={() => void handleContact()}
                  disabled={contacting}
                >
                  {contacting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  {t("contactCta")}
                </Button>
              )}

              <div className="border-t border-servido-950/[0.06] pt-6">
                <h2 className="text-lg font-semibold text-servido-950">{t("descriptionTitle")}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {listing.description || t("noDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-servido-950 lg:text-xl">{t("specsTitle")}</h2>
          <VehicleSpecsTable listing={listing} />
        </section>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteListingTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteListingDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("formCancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault()
                  void handleDelete()
                }}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("deleteListingConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
