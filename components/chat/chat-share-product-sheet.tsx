"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { useTranslations } from "next-intl"
import { db } from "@/lib/firebase"
import { fetchProductListingForChat } from "@/lib/chat-listing-share"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { usePriceFormat } from "@/hooks/use-price-format"

interface ProductRow {
  id: string
  name: string
  price: number
  imageUrl?: string | null
}

interface ChatShareProductSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sellerId: string
  onShare: (productId: string) => void | Promise<void>
  sharingId?: string | null
}

export function ChatShareProductSheet({
  open,
  onOpenChange,
  sellerId,
  onShare,
  sharingId,
}: ChatShareProductSheetProps) {
  const t = useTranslations("chat")
  const { formatPrice } = usePriceFormat()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductRow[]>([])

  useEffect(() => {
    if (!open || !sellerId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const snap = await getDocs(
          query(collection(db, "products"), where("sellerId", "==", sellerId), limit(24))
        )
        if (cancelled) return
        const rows: ProductRow[] = []
        for (const d of snap.docs) {
          const data = d.data()
          if (data.isService) continue
          const listing = await fetchProductListingForChat(d.id)
          rows.push({
            id: d.id,
            name: listing?.listingTitle || String(data.name || ""),
            price: listing?.listingPrice ?? (Number(data.price) || 0),
            imageUrl: listing?.listingImageUrl,
          })
        }
        setProducts(rows)
      } catch (err) {
        console.error(err)
        setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, sellerId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t("sharePickerTitle")}</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-sm text-muted-foreground">{t("sharePickerHint")}</p>
        <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pb-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
            </div>
          ) : products.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{t("sharePickerEmpty")}</p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt="" fill className="object-cover" unoptimized />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-sm font-medium text-servido-800">{formatPrice(p.price)}</p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={sharingId === p.id}
                  onClick={() => void onShare(p.id)}
                >
                  {sharingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sharePickerSend")}
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
