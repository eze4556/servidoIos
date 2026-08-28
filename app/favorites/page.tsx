"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Star, MapPin, Clock, User, ShoppingCart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"
import { db } from "@/lib/firebase"
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { usePriceFormat } from "@/hooks/use-price-format"
import { getProductThumbnail } from "@/lib/image-utils"
import { productHref } from "@/lib/routes"
import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "next-intl"
import type { ProductMedia } from "@/types/product"

interface FavoriteProduct {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  media?: ProductMedia[]
  category?: string
  sellerId: string
  sellerName?: string
  sellerLocation?: string
  rating?: number
  reviewCount?: number
  isService: boolean
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
  createdAt?: unknown
  favoriteId: string
}

function mapFavoriteFromProduct(
  productId: string,
  favoriteId: string,
  productData: Record<string, unknown>
): FavoriteProduct {
  return {
    id: productId,
    favoriteId,
    name: (productData.name as string) || "",
    description: productData.description as string | undefined,
    price: Number(productData.price) || 0,
    imageUrl: productData.imageUrl as string | undefined,
    media: productData.media as ProductMedia[] | undefined,
    category: productData.category as string | undefined,
    sellerId: (productData.sellerId as string) || "",
    sellerName: productData.sellerName as string | undefined,
    sellerLocation: productData.sellerLocation as string | undefined,
    rating: productData.rating as number | undefined,
    reviewCount: productData.reviewCount as number | undefined,
    isService: Boolean(productData.isService),
    condition: productData.condition as "nuevo" | "usado" | undefined,
    freeShipping: productData.freeShipping as boolean | undefined,
    shippingCost: productData.shippingCost as number | undefined,
    createdAt: productData.createdAt,
  }
}

function mapFavoriteFromDoc(
  productId: string,
  favoriteId: string,
  favoriteData: Record<string, unknown>
): FavoriteProduct | null {
  if (!favoriteData.name) return null

  return {
    id: productId,
    favoriteId,
    name: favoriteData.name as string,
    price: Number(favoriteData.price) || 0,
    imageUrl: favoriteData.imageUrl as string | undefined,
    sellerId: (favoriteData.sellerId as string) || "",
    isService: Boolean(favoriteData.isService),
  }
}

export default function FavoritesPage() {
  const { formatPrice } = usePriceFormat()
  const tf = useTranslations("favorites")
  const tc = useTranslations("cart")
  const tr = useTranslations("roles")
  const ts = useTranslations("servicesPage")
  const { currentUser, authLoading } = useAuth()
  const { addItem } = useCart()
  const { toast } = useToast()
  const userId = currentUser?.firebaseUser.uid
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchRequestRef = useRef(0)

  const loadFavorites = useCallback(async (userUid: string) => {
    const requestId = ++fetchRequestRef.current

    try {
      const favoritesSnapshot = await getDocs(
        query(collection(db, "favorites"), where("userId", "==", userUid))
      )

      if (requestId !== fetchRequestRef.current) return

      if (favoritesSnapshot.empty) {
        setFavorites([])
        return
      }

      const favoritesData = await Promise.all(
        favoritesSnapshot.docs.map(async (favoriteDoc) => {
          const favoriteData = favoriteDoc.data()
          const productId = favoriteData.productId as string
          if (!productId) return null

          try {
            const productSnap = await getDoc(doc(db, "products", productId))
            if (productSnap.exists()) {
              return mapFavoriteFromProduct(productId, favoriteDoc.id, productSnap.data())
            }
          } catch (productError) {
            console.error(`Error fetching product ${productId}:`, productError)
          }

          return mapFavoriteFromDoc(productId, favoriteDoc.id, favoriteData)
        })
      )

      if (requestId !== fetchRequestRef.current) return

      setFavorites(favoritesData.filter((item): item is FavoriteProduct => item !== null))
    } catch (err) {
      if (requestId !== fetchRequestRef.current) return

      console.error("Error fetching favorites:", err)
      setError(tf("loadError"))
      setFavorites([])
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!userId) {
      fetchRequestRef.current += 1
      setFavorites([])
      setError(null)
      setLoading(false)
      setHasLoaded(true)
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      await loadFavorites(userId)

      if (!cancelled) {
        setLoading(false)
        setHasLoaded(true)
      }
    }

    void run()

    return () => {
      cancelled = true
      fetchRequestRef.current += 1
    }
  }, [authLoading, userId, loadFavorites])

  const retryFetch = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    await loadFavorites(userId)

    setLoading(false)
    setHasLoaded(true)
  }, [loadFavorites, userId])

  const removeFromFavorites = async (favoriteId: string, productName: string) => {
    try {
      await deleteDoc(doc(db, "favorites", favoriteId))
      setFavorites((prev) => prev.filter((fav) => fav.favoriteId !== favoriteId))

      toast({
        title: tf("removed"),
        description: `${productName} se eliminó de tus favoritos`,
        duration: 3000,
      })
    } catch (removeError) {
      console.error("Error removing favorite:", removeError)
      toast({
        title: tc("error"),
        description: tf("removeError"),
        variant: "destructive",
      })
    }
  }

  const addToCart = (product: FavoriteProduct) => {
    if (!currentUser) {
      toast({
        title: tc("error"),
        description: tf("loginForCart"),
        variant: "destructive",
      })
      return
    }

    try {
      addItem({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
        media: product.media,
        isService: product.isService,
        sellerId: product.sellerId,
        condition: product.condition,
        freeShipping: product.freeShipping,
        shippingCost: product.shippingCost,
      })

      toast({
        title: tf("addedToCart"),
        description: tf("addedToCartDesc", { name: product.name || tf("unnamedProduct") }),
        duration: 3000,
      })
    } catch (cartError) {
      console.error("Error adding to cart:", cartError)
      toast({
        title: tc("error"),
        description: tf("addToCartError"),
        variant: "destructive",
      })
    }
  }

  if ((authLoading || loading) && !hasLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-servido-200 border-t-servido-800" />
          <p className="mt-4 text-slate-600">{tf("loading")}</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
        <div className="container mx-auto max-w-screen-xl px-4 py-16 md:px-6">
          <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-12 text-center shadow-[0_24px_50px_-28px_rgba(46,16,101,0.32)] ring-1 ring-servido-950/5">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-800">
              <Heart className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-servido-950">{tf("title")}</h1>
            <p className="mt-3 text-slate-600">{tf("loginHint")}</p>
            <div className="mt-8 space-y-3">
              <Link href="/login">
                <Button className="w-full rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]">
                  {tf("login")}
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="w-full rounded-full border-servido-200 text-servido-900 hover:bg-servido-50">
                  {tf("createAccount")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
          <p className="mb-4 text-red-600">{error}</p>
          <Button
            onClick={() => void retryFetch()}
            className="rounded-full bg-servido-950 text-white hover:bg-servido-800"
          >
            {tf("retry")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <section className="mb-8 overflow-hidden rounded-2xl bg-servido-950 shadow-[0_24px_60px_-28px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 lg:mb-10 lg:rounded-[1.75rem]">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  <Heart className="h-3.5 w-3.5 text-servido-gold" />
                  Servido
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {tf("title")}
                </h1>
                <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">{tf("subtitle")}</p>
              </div>
              {favorites.length > 0 && (
                <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-servido-gold ring-1 ring-white/10">
                  {favorites.length === 1
                    ? tf("count", { count: favorites.length })
                    : tf("countPlural", { count: favorites.length })}
                </p>
              )}
            </div>
          </div>
        </section>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {favorites.map((product) => (
              <Card
                key={product.favoriteId}
                className="group h-full overflow-hidden rounded-2xl border-0 bg-white shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl"
              >
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-servido-50/40">
                  <Image
                    src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-2.5 top-2.5">
                    <Badge className="rounded-full bg-servido-800 text-white hover:bg-servido-800">
                      {product.isService ? tf("service") : tf("product")}
                    </Badge>
                  </div>
                  {product.condition && (
                    <div className="absolute left-2.5 top-11">
                      <Badge
                        variant={product.condition === "nuevo" ? "default" : "secondary"}
                        className="rounded-full"
                      >
                        {product.condition === "nuevo" ? tc("conditionNew") : tc("conditionUsed")}
                      </Badge>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void removeFromFavorites(product.favoriteId, product.name)
                    }}
                    className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-md ring-1 ring-servido-950/5 transition-colors hover:bg-red-50"
                    title={tf("removeTitle")}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <Link href={productHref(product.id)}>
                    <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-servido-950 transition-colors group-hover:text-servido-800">
                      {product.name || tf("unnamedProduct")}
                    </h3>
                  </Link>

                  {product.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-500">{product.description}</p>
                  )}

                  <div className="mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="truncate text-sm text-slate-600">{product.sellerName || tr("seller")}</span>
                  </div>

                  {product.sellerLocation && (
                    <div className="mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="truncate text-sm text-slate-600">{product.sellerLocation}</span>
                    </div>
                  )}

                  {product.rating && (
                    <div className="mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current text-amber-400" />
                      <span className="text-sm text-slate-600">
                        {product.rating.toFixed(1)} ({product.reviewCount || 0})
                      </span>
                    </div>
                  )}

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xl font-bold tracking-tight text-servido-800">
                      {formatPrice(product.price)}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      <span>{ts("available")}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        addToCart(product)
                      }}
                      className="flex-1 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                      size="sm"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {tf("add")}
                    </Button>
                    <Link href={productHref(product.id)} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full rounded-full border-servido-200 text-servido-900 hover:bg-servido-50"
                        size="sm"
                      >
                        {tf("view")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-300">
              <Heart className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-servido-950">{tf("emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600">{tf("emptyHint")}</p>
            <Link href="/products">
              <Button
                size="lg"
                className="mt-8 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
              >
                {tf("goProducts")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
