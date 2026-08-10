"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, MessageCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { VehicleDetailGallery } from "@/components/vehicles/vehicle-detail-gallery"
import { VehicleSpecsTable } from "@/components/vehicles/vehicle-specs-table"
import { fetchVehicleListingById } from "@/lib/vehicles/vehicle-listings"
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
    if (!currentUser?.firebaseUser?.uid) {
      router.push(`/login?redirect=/autos/${listing.id}`)
      return
    }
    const buyerId = currentUser.firebaseUser.uid
    if (buyerId === listing.sellerId) {
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
        buyerId,
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    )
  }

  if (!listing || (listing.status !== "active" && listing.sellerId !== currentUser?.firebaseUser?.uid)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-slate-400">{t("notFound")}</p>
        <Button asChild className="mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20" variant="outline">
          <Link href="/autos">{t("backToCatalog")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 pb-8 md:py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-300 hover:bg-white/10 hover:text-white">
        <Link href="/autos">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToCatalog")}
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        <VehicleDetailGallery media={listing.media} alt={listing.title} />

        <div className="space-y-6 rounded-2xl border border-servido-200/80 bg-white p-6 shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-servido-700">
              {t(`vehicleType.${listing.vehicleType}`)} · {listing.year}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-servido-900 md:text-3xl">{listing.title}</h1>
            <p className="mt-3 text-3xl font-bold text-servido-800">
              {formatVehiclePrice(listing.price, listing.priceCurrency, locale)}
            </p>
            <p className="mt-1 text-sm text-servido-600">{listing.locationLabel}</p>
          </div>

          {listing.allowChat && (
            <Button
              size="lg"
              className="w-full bg-white font-semibold text-servido-800 shadow-md hover:bg-purple-50 sm:w-auto"
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

          <div className="border-t border-servido-100 pt-6">
            <h2 className="text-lg font-semibold text-servido-900">{t("descriptionTitle")}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-servido-700">
              {listing.description || t("noDescription")}
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">{t("specsTitle")}</h2>
        <VehicleSpecsTable listing={listing} />
      </section>
    </div>
  )
}
