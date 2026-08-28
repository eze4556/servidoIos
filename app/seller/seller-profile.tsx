"use client"

import { useState, useEffect } from "react"
import { useRouteId } from "@/hooks/use-route-id"
import { productHref } from "@/lib/routes"
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Store, 
  Package, 
  Star, 
  MapPin, 
  Calendar, 
  Search, 
  Filter,
  Heart,
  ShoppingCart,
  MessageSquare,
  Loader2,
  AlertCircle,
  User,
  Edit,
  Trash2
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePriceFormat } from "@/hooks/use-price-format"
import { getProductThumbnail } from "@/lib/image-utils"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"
import { FollowButton } from "@/components/follows/follow-button"
import { useLocale, useTranslations } from "next-intl"
import { useToast } from "@/components/ui/use-toast"

interface SellerProfile {
  uid: string
  displayName?: string
  email?: string
  photoURL?: string
  createdAt?: any
  subscription_status?: "active" | "inactive" | "cancelled"
  subscription?: {
    status?: string
  }
  isSubscribed?: boolean
  description?: string
  location?: string
  phone?: string
  website?: string
  socialMedia?: {
    instagram?: string
    facebook?: string
    twitter?: string
  }
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  media: any[]
  imageUrl?: string
  isService: boolean
  sellerId: string
  stock?: number
  createdAt: any
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
  couponId?: string
  couponStartDate?: any
  couponEndDate?: any
}

export function SellerProfile() {
  const { formatPrice } = usePriceFormat()
  const ts = useTranslations("sellerStore")
  const tp = useTranslations("product")
  const tc = useTranslations("cart")
  const tsv = useTranslations("servicesPage")
  const tr = useTranslations("reviews")
  const locale = useLocale()
  const { toast } = useToast()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const sellerId = useRouteId() ?? ""
  const { currentUser } = useAuth()
  const { addItem } = useCart()

  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [priceFilter, setPriceFilter] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [activeTab, setActiveTab] = useState("products")

  // Estados para interacciones
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [favoriting, setFavoriting] = useState<string | null>(null)

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) return

      try {
        setLoading(true)
        setError(null)

        // Obtener datos del vendedor
        const sellerDoc = await getDoc(doc(db, "users", sellerId))
        if (!sellerDoc.exists()) {
          setError(ts("notFound"))
          return
        }

        const sellerData = sellerDoc.data() as SellerProfile
        setSeller({ ...sellerData, uid: sellerId })

        // Obtener productos del vendedor
        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId),
          where("isService", "==", false),
          orderBy("createdAt", "desc")
        )
        const productsSnapshot = await getDocs(productsQuery)
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setProducts(productsData)

        // Obtener servicios del vendedor
        const servicesQuery = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId),
          where("isService", "==", true),
          orderBy("createdAt", "desc")
        )
        const servicesSnapshot = await getDocs(servicesQuery)
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
        setServices(servicesData)

      } catch (err) {
        console.error("Error fetching seller data:", err)
        setError(ts("loadError"))
      } finally {
        setLoading(false)
      }
    }

    fetchSellerData()
  }, [sellerId])

  // Filtrar y ordenar productos
  const getFilteredItems = (items: Product[]) => {
    let filtered = items

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por categoría
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Filtro por precio
    if (priceFilter && priceFilter !== "all") {
      const [min, max] = priceFilter.split("-").map(Number)
      filtered = filtered.filter(item => {
        if (max) {
          return item.price >= min && item.price <= max
        }
        return item.price >= min
      })
    }

    // Ordenamiento
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "newest":
      default:
        filtered.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())
        break
    }

    return filtered
  }

  const handleAddToCart = async (product: Product) => {
    if (!currentUser) {
      // Redirigir al login si no está autenticado
      window.location.href = "/login"
      return
    }

    setAddingToCart(product.id)
    try {
      addItem({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: product.price, // Sin descuento por defecto
        quantity: 1,
        imageUrl: product.imageUrl,
        media: product.media,
        isService: product.isService,
        sellerId: product.sellerId,
        stock: product.stock,
        condition: product.condition,
        freeShipping: product.freeShipping,
        shippingCost: product.shippingCost
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setAddingToCart(null)
    }
  }

  const handleAddToFavorites = async (productId: string) => {
    if (!currentUser) {
      window.location.href = "/login"
      return
    }

    setFavoriting(productId)
    try {
      // Aquí implementarías la lógica para agregar a favoritos
      // Por ahora solo simulamos
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error("Error adding to favorites:", error)
    } finally {
      setFavoriting(null)
    }
  }

  // Verificar si el usuario actual es el propietario de la tienda
  const isOwner = currentUser?.firebaseUser.uid === sellerId

  // const handleContactSeller = async () => {
  //   if (!currentUser) {
  //     window.location.href = "/login"
  //     return
  //   }

  //   // No permitir contactarse a sí mismo
  //   if (isOwner) {
  //     return
  //   }

  //   // Aquí implementarías la lógica para iniciar chat
  //   window.location.href = `/chat/${sellerId}`
  // }

  const handleContactSeller = async () => {
    toast({
      title: tc("error"),
      description: ts("chatDisabled"),
      duration: 4000,
    })
  }

  const handleDeleteProduct = async (productId: string, isService: boolean) => {
    if (!isOwner) return

    if (confirm(ts("deleteConfirm", { item: isService ? ts("itemService") : ts("itemProduct") }))) {
      try {
        await deleteDoc(doc(db, "products", productId))
        // Actualizar la lista local
        if (isService) {
          setServices(prev => prev.filter(s => s.id !== productId))
        } else {
          setProducts(prev => prev.filter(p => p.id !== productId))
        }
      } catch (error) {
        console.error("Error deleting product:", error)
        toast({
          title: tc("error"),
          description: ts("deleteError"),
          variant: "destructive",
        })
      }
    }
  }

  const handleEditProduct = (productId: string) => {
    if (!isOwner) return
    // Redirigir a la página de edición
    window.location.href = `/dashboard/seller/edit/${productId}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  if (error || !seller) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <Alert variant="destructive" className="max-w-md rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("errorTitle")}</AlertTitle>
          <AlertDescription>{error || ts("notFound")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const filteredProducts = getFilteredItems(products)
  const filteredServices = getFilteredItems(services)
  const categories = [...new Set([...products, ...services].map(item => item.category))]

  const sellerDisplayName = seller.displayName || ts("defaultName")
  const memberSinceDate = seller.createdAt?.toDate?.()?.toLocaleDateString(dateLocale)
  const memberSinceLabel = ts("sellerSince", {
    date: memberSinceDate || ts("recently"),
  })
  const daysActive = seller.createdAt?.toDate?.()
    ? Math.floor((Date.now() - seller.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      {/* Header del vendedor */}
      <div className="relative overflow-hidden bg-servido-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.2),transparent_45%)]" />

        <div className="container relative mx-auto max-w-screen-xl px-4 py-8 md:px-6 md:py-10 xl:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/20 shadow-lg lg:h-24 lg:w-24">
                <Image
                  src={seller.photoURL || "/placeholder-user.jpg"}
                  alt={sellerDisplayName}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
                  <Store className="h-6 w-6 text-servido-gold" />
                  {sellerDisplayName}
                </h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
                  <Calendar className="h-4 w-4" />
                  {memberSinceLabel}
                </p>
                {seller.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-white/70">
                    <MapPin className="h-4 w-4" />
                    {seller.location}
                  </p>
                )}
              </div>
            </div>

            <div className="ml-auto flex flex-wrap gap-2">
              {!isOwner && (
                <FollowButton
                  targetUserId={sellerId}
                  targetType="store"
                  targetName={sellerDisplayName}
                  targetPhotoURL={seller.photoURL}
                />
              )}
              {!isOwner && (
                <Button
                  onClick={handleContactSeller}
                  className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {ts("contact")}
                </Button>
              )}
              {isOwner && (
                <Button asChild className="rounded-full bg-white text-servido-950 hover:bg-white/90">
                  <Link href="/dashboard/seller">
                    <User className="mr-2 h-4 w-4" />
                    {ts("myDashboard")}
                  </Link>
                </Button>
              )}
              {(seller.subscription_status === "active" || seller.subscription?.status === "active" || seller.isSubscribed) && (
                <Badge className="rounded-full bg-servido-gold/20 text-servido-gold hover:bg-servido-gold/20">
                  <Star className="mr-1 h-3 w-3" />
                  {ts("verifiedBadge")}
                </Badge>
              )}
            </div>
          </div>

          {seller.description && (
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/75 sm:text-base">
              {seller.description}
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {[
              { value: products.length, label: ts("statProducts") },
              { value: services.length, label: ts("statServices") },
              { value: daysActive, label: ts("statDaysActive") },
              { value: "4.8", label: ts("statRating") },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur-sm"
              >
                <div className="text-2xl font-bold tabular-nums text-servido-gold">{stat.value}</div>
                <div className="mt-0.5 text-xs text-white/60 sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-screen-xl px-4 py-8 md:px-6 xl:px-8">
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-[0_16px_40px_-28px_rgba(46,16,101,0.3)] ring-1 ring-servido-950/5 lg:rounded-3xl lg:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={ts("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-2xl border-0 bg-slate-100/90 pl-10 ring-1 ring-servido-950/5 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-servido-800/25"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-slate-100/90 ring-1 ring-servido-950/5 md:w-48">
                <SelectValue placeholder={ts("allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ts("allCategories")}</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-slate-100/90 ring-1 ring-servido-950/5 md:w-48">
                <SelectValue placeholder={ts("allPrices")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ts("allPrices")}</SelectItem>
                <SelectItem value="0-1000">{ts("priceUpTo1k")}</SelectItem>
                <SelectItem value="1000-5000">{ts("price1k5k")}</SelectItem>
                <SelectItem value="5000-10000">{ts("price5k10k")}</SelectItem>
                <SelectItem value="10000-">{ts("priceOver10k")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-slate-100/90 ring-1 ring-servido-950/5 md:w-48">
                <SelectValue placeholder={ts("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{ts("sortNewest")}</SelectItem>
                <SelectItem value="price-low">{ts("sortPriceLow")}</SelectItem>
                <SelectItem value="price-high">{ts("sortPriceHigh")}</SelectItem>
                <SelectItem value="name">{ts("sortName")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-servido-950/5">
            <TabsTrigger value="products" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-servido-950 data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              {ts("tabProducts", { count: filteredProducts.length })}
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-servido-950 data-[state=active]:text-white">
              <Store className="h-4 w-4" />
              {ts("tabServices", { count: filteredServices.length })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{ts("emptyProductsTitle")}</h3>
                  <p className="text-gray-500 text-center">
                    {ts("emptyProductsBody")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="group overflow-hidden rounded-2xl border-0 bg-white shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition-all hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl">
                    <CardContent className="p-4">
                      <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-slate-100 lg:rounded-2xl">
                        <Image
                          src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute right-2 top-2 flex gap-1">
                          {!isOwner && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                              onClick={() => handleAddToFavorites(product.id)}
                              disabled={favoriting === product.id}
                            >
                              {favoriting === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-servido-800/90 text-white hover:bg-servido-800"
                                onClick={() => handleEditProduct(product.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-red-500/90 text-white hover:bg-red-500"
                                onClick={() => handleDeleteProduct(product.id, false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        {product.condition && (
                          <Badge
                            variant="secondary"
                            className="absolute left-2 top-2 rounded-full bg-white/90 text-xs"
                          >
                            {product.condition === "nuevo" ? tc("conditionNew") : tc("conditionUsed")}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h3 className="line-clamp-2 font-semibold text-servido-950">
                          <Link href={productHref(product.id)} className="hover:text-servido-800">
                            {product.name}
                          </Link>
                        </h3>
                        <p className="line-clamp-2 text-sm text-slate-500">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold tracking-tight text-servido-800">
                            {formatPrice(product.price)}
                          </span>
                          {!isOwner && (
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                              disabled={addingToCart === product.id}
                              className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                            >
                              {addingToCart === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <div className="text-sm text-slate-500">
                              {ts("yourProduct")}
                            </div>
                          )}
                        </div>
                        {product.freeShipping && (
                          <Badge variant="outline" className="text-xs">
                            {tp("freeShipping")}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services">
            {filteredServices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Store className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{ts("emptyServicesTitle")}</h3>
                  <p className="text-gray-500 text-center">
                    {ts("emptyServicesBody")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="group overflow-hidden rounded-2xl border-0 bg-white shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition-all hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl">
                    <CardContent className="p-4">
                      <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-slate-100 lg:rounded-2xl">
                        <Image
                          src={getProductThumbnail(service.media, service.imageUrl, service.name)}
                          alt={service.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute right-2 top-2 flex gap-1">
                          {!isOwner && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                              onClick={() => handleAddToFavorites(service.id)}
                              disabled={favoriting === service.id}
                            >
                              {favoriting === service.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-servido-800/90 text-white hover:bg-servido-800"
                                onClick={() => handleEditProduct(service.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-red-500/90 text-white hover:bg-red-500"
                                onClick={() => handleDeleteProduct(service.id, true)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <Badge className="absolute left-2 top-2 rounded-full bg-servido-800 text-xs text-white hover:bg-servido-800">
                          {tsv("badge")}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <h3 className="line-clamp-2 font-semibold text-servido-950">
                          <Link href={productHref(service.id)} className="hover:text-servido-800">
                            {service.name}
                          </Link>
                        </h3>
                        <p className="line-clamp-2 text-sm text-slate-500">{service.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold tracking-tight text-servido-800">
                            {formatPrice(service.price)}
                          </span>
                          {!isOwner && (
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(service)}
                              disabled={addingToCart === service.id}
                              className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                            >
                              {addingToCart === service.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwner && (
                            <div className="text-sm text-slate-500">
                              {ts("yourService")}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 
