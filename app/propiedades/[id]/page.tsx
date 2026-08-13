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

import { PropertyDetailGallery } from "@/components/properties/property-detail-gallery"

import { PropertySpecsTable } from "@/components/properties/property-specs-table"

import { deletePropertyListing, fetchPropertyListingById } from "@/lib/properties/property-listings"

import { formatPropertyPrice } from "@/lib/properties/format-property-price"

import { startPropertyListingChat } from "@/lib/chat-start"

import type { PropertyListing } from "@/types/property-listing"

import { useToast } from "@/components/ui/use-toast"



export default function PropertyDetailPage() {

  const params = useParams()

  const id = typeof params.id === "string" ? params.id : ""

  const t = useTranslations("properties")

  const locale = useLocale()

  const router = useRouter()

  const { currentUser } = useAuth()

  const { toast } = useToast()



  const [listing, setListing] = useState<PropertyListing | null>(null)

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

      const data = await fetchPropertyListingById(id)

      setListing(data)

      setLoading(false)

    })()

  }, [id])



  const handleContact = async () => {

    if (!listing) return

    if (!uid) {

      router.push(`/login?redirect=/propiedades/${listing.id}`)

      return

    }

    if (uid === listing.sellerId) {

      toast({ title: t("chatSelfError"), variant: "destructive" })

      return

    }



    setContacting(true)

    try {

      const priceLabel = formatPropertyPrice(listing.price, listing.priceCurrency, locale)

      const initialMessage = t("chatInitialMessage", {

        title: listing.title,

        price: priceLabel,

      })

      const thumb =

        listing.media.find((m) => m.type === "image")?.url || listing.media.find((m) => m.type === "video")?.url

      const chatId = await startPropertyListingChat({

        listingId: listing.id,

        buyerId: uid,

        buyerName: currentUser.displayName || currentUser.email || t("chatBuyerFallback"),

        sellerId: listing.sellerId,

        sellerName: listing.sellerDisplayName,

        propertyTitle: listing.title,

        propertyThumbnail: thumb,

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

      await deletePropertyListing(listing.id, uid)

      router.push("/propiedades")

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

        <Loader2 className="h-10 w-10 animate-spin text-white" />

      </div>

    )

  }



  if (!listing || (listing.status !== "active" && listing.sellerId !== uid)) {

    return (

      <div className="mx-auto max-w-lg px-4 py-20 text-center">

        <p className="text-indigo-200/70">{t("notFound")}</p>

        <Button asChild className="mt-4 border-white/20 bg-white/10 text-white hover:bg-white/20" variant="outline">

          <Link href="/propiedades">{t("backToCatalog")}</Link>

        </Button>

      </div>

    )

  }



  return (

    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 pb-8 md:py-8">

      <Button asChild variant="ghost" size="sm" className="-ml-2 text-indigo-100 hover:bg-white/10 hover:text-white">

        <Link href="/propiedades">

          <ArrowLeft className="mr-2 h-4 w-4" />

          {t("backToCatalog")}

        </Link>

      </Button>



      <div className="grid gap-8 lg:grid-cols-2">

        <PropertyDetailGallery media={listing.media} alt={listing.title} />



        <div className="space-y-6 rounded-2xl border border-servido-200/80 bg-white p-6 shadow-lg">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-servido-700">

              {t(`operation.${listing.operation}`)} · {t(`propertyType.${listing.propertyType}`)}

            </p>

            <h1 className="mt-2 text-2xl font-bold text-servido-900 md:text-3xl">{listing.title}</h1>

            <p className="mt-3 text-3xl font-bold text-servido-800">

              {formatPropertyPrice(listing.price, listing.priceCurrency, locale)}

            </p>

            <p className="mt-1 text-sm text-servido-600">{listing.locationLabel}</p>

          </div>



          {isOwner && (

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

              <p className="text-sm font-semibold text-amber-900">{t("ownerBannerTitle")}</p>

              {listing.status !== "active" && (

                <p className="mt-1 text-xs font-medium text-amber-800">{t(`status.${listing.status}`)}</p>

              )}

              <div className="mt-3 flex flex-wrap gap-2">

                <Button asChild size="sm" variant="outline" className="border-amber-300 bg-white hover:bg-amber-100">

                  <Link href={`/dashboard/seller/properties?edit=${listing.id}`}>{t("editListing")}</Link>

                </Button>

                <Button

                  size="sm"

                  variant="outline"

                  className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"

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

              className="w-full bg-white font-semibold text-servido-800 shadow-md hover:bg-indigo-50 sm:w-auto"

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

        <PropertySpecsTable listing={listing} />

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

  )

}

