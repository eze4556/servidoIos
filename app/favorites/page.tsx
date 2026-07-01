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
import { formatPrice } from "@/lib/utils"
import { getProductThumbnail } from "@/lib/image-utils"
import { useToast } from "@/components/ui/use-toast"
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
    name: (productData.name as string) || "Producto",
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
      setError("Error al cargar tus favoritos. Intenta de nuevo más tarde.")
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
        title: "Favorito eliminado",
        description: `${productName} se eliminó de tus favoritos`,
        duration: 3000,
      })
    } catch (removeError) {
      console.error("Error removing favorite:", removeError)
      toast({
        title: "Error",
        description: "No se pudo eliminar el favorito",
        variant: "destructive",
      })
    }
  }

  const addToCart = (product: FavoriteProduct) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para agregar productos al carrito",
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
        title: "Agregado al carrito",
        description: `${product.name} se agregó a tu carrito`,
        duration: 3000,
      })
    } catch (cartError) {
      console.error("Error adding to cart:", cartError)
      toast({
        title: "Error",
        description: "No se pudo agregar al carrito",
        variant: "destructive",
      })
    }
  }

  if ((authLoading || loading) && !hasLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
            <p className="mt-4 text-gray-600">Cargando tus favoritos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md text-center">
            <Heart className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Mis Favoritos</h1>
            <p className="mb-6 text-gray-600">
              Inicia sesión para ver y gestionar tus productos favoritos
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">Iniciar Sesión</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Crear Cuenta
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => void retryFetch()}>Intentar de nuevo</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-800 to-purple-900 py-12 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-purple-200" />
            <h1 className="mb-4 text-4xl font-bold">Mis Favoritos</h1>
            <p className="mx-auto max-w-2xl text-xl text-purple-200">
              Tus productos y servicios favoritos guardados para acceder fácilmente
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {favorites.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {favorites.length} favorito{favorites.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favorites.map((product) => (
                <Card key={product.favoriteId} className="group h-full transition-shadow duration-200 hover:shadow-lg">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg bg-white">
                    <Image
                      src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute left-2 top-2">
                      <Badge className="bg-purple-600 text-white">
                        {product.isService ? "Servicio" : "Producto"}
                      </Badge>
                    </div>
                    {product.condition && (
                      <div className="absolute right-10 top-2">
                        <Badge variant={product.condition === "nuevo" ? "default" : "secondary"}>
                          {product.condition === "nuevo" ? "Nuevo" : "Usado"}
                        </Badge>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void removeFromFavorites(product.favoriteId, product.name)
                      }}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                      title="Eliminar de favoritos"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold transition-colors group-hover:text-purple-600">
                        {product.name}
                      </h3>
                    </Link>

                    {product.description && (
                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">{product.description}</p>
                    )}

                    <div className="mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{product.sellerName || "Vendedor"}</span>
                    </div>

                    {product.sellerLocation && (
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{product.sellerLocation}</span>
                      </div>
                    )}

                    {product.rating && (
                      <div className="mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 fill-current text-yellow-400" />
                        <span className="text-sm text-gray-600">
                          {product.rating.toFixed(1)} ({product.reviewCount || 0} reseñas)
                        </span>
                      </div>
                    )}

                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xl font-bold text-purple-600">{formatPrice(product.price)}</span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Disponible</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          addToCart(product)
                        }}
                        className="flex-1"
                        size="sm"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                      <Link href={`/product/${product.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <Heart className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">No hay favoritos</h2>
            <p className="mx-auto mb-8 max-w-md text-gray-600">
              Todavía no agregaste ningún producto. Explorá el catálogo y guardá los que más te gusten.
            </p>
            <Link href="/products">
              <Button size="lg">Ir a productos</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
