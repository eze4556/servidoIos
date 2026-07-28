"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Star, MapPin, Clock, User, Package } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { formatPrice } from "@/lib/utils"
import { getProductThumbnail } from "@/lib/image-utils"
import type { ProductMedia } from "@/types/product"
import { useTranslations } from "next-intl"

interface Service {
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
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
  createdAt: any
}

export default function ServicesPage() {
  const ts = useTranslations("servicesPage")
  const tc = useTranslations("cart")
  const tr = useTranslations("roles")
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [priceRange, setPriceRange] = useState<string>("all")
  
  // Estados para categorías
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetchServices()
    fetchCategories()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    try {
      // Obtener solo productos que son servicios
      const servicesQuery = query(
        collection(db, "products"),
        where("isService", "==", true),
        orderBy("createdAt", "desc")
      )
      const servicesSnapshot = await getDocs(servicesQuery)
      const servicesData = servicesSnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Service[]
      
      setServices(servicesData)
      setFilteredServices(servicesData)
    } catch (err) {
      console.error("Error fetching services:", err)
      setError(ts("loadError"))
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
      const categorySnapshot = await getDocs(categoriesQuery)
      setCategories(categorySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        name: doc.data().name 
      })))
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...services]

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term) ||
        service.sellerName?.toLowerCase().includes(term)
      )
    }

    // Filtro por categoría
    if (selectedCategory !== "all") {
      filtered = filtered.filter(service => service.category === selectedCategory)
    }

    // Filtro por rango de precio
    if (priceRange !== "all") {
      switch (priceRange) {
        case "0-1000":
          filtered = filtered.filter(service => service.price <= 1000)
          break
        case "1000-5000":
          filtered = filtered.filter(service => service.price > 1000 && service.price <= 5000)
          break
        case "5000-10000":
          filtered = filtered.filter(service => service.price > 5000 && service.price <= 10000)
          break
        case "10000+":
          filtered = filtered.filter(service => service.price > 10000)
          break
      }
    }

    // Ordenamiento
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "newest":
        filtered.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())
        break
      case "oldest":
        filtered.sort((a, b) => a.createdAt?.toDate?.() - b.createdAt?.toDate?.())
        break
    }

    setFilteredServices(filtered)
  }, [services, searchTerm, selectedCategory, sortBy, priceRange])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setSortBy("newest")
    setPriceRange("all")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{ts("loading")}</p>
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
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchServices}>Intentar de nuevo</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-5">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 sm:rounded-3xl">
            <Image
              src="/images/bannernuevooficial4.jpeg"
              alt={ts("bannerAlt")}
              width={1600}
              height={723}
              className="h-auto w-full"
              sizes="(max-width: 1056px) calc(100vw - 2rem), 1024px"
              priority
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={ts("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={ts("categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ts("allCategories")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rango de precio */}
            <div>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder={ts("pricePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ts("allPrices")}</SelectItem>
                  <SelectItem value="0-1000">{ts("priceUpTo1k")}</SelectItem>
                  <SelectItem value="1000-5000">{ts("price1k5k")}</SelectItem>
                  <SelectItem value="5000-10000">{ts("price5k10k")}</SelectItem>
                  <SelectItem value="10000+">{ts("priceOver10k")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenar por */}
            <div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder={ts("sortPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{ts("sortNewest")}</SelectItem>
                  <SelectItem value="oldest">{ts("sortOldest")}</SelectItem>
                  <SelectItem value="price-low">{ts("sortPriceLow")}</SelectItem>
                  <SelectItem value="price-high">{ts("sortPriceHigh")}</SelectItem>
                  <SelectItem value="rating">{ts("sortRating")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(searchTerm || selectedCategory !== "all" || priceRange !== "all" || sortBy !== "newest") && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {ts("clearFilters")}
              </Button>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              {filteredServices.length === 1
                ? ts("foundOne")
                : ts("foundMany", { count: filteredServices.length })}
            </h2>
          </div>
        </div>

        {/* Grid de servicios */}
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <Link key={service.id} href={`/product/${service.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <Image
                      src={getProductThumbnail(service.media, service.imageUrl, service.name)}
                      alt={service.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-purple-600 text-white">
                        {ts("badge")}
                      </Badge>
                    </div>
                    {service.condition && (
                      <div className="absolute top-2 right-2">
                        <Badge variant={service.condition === 'nuevo' ? 'default' : 'secondary'}>
                          {service.condition === 'nuevo' ? tc("conditionNew") : tc("conditionUsed")}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {service.name}
                    </h3>
                    
                    {service.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {service.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {service.sellerName || tr("seller")}
                      </span>
                    </div>

                    {service.sellerLocation && (
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {service.sellerLocation}
                        </span>
                      </div>
                    )}

                    {service.rating && (
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">
                          {ts("reviews", {
                            rating: service.rating.toFixed(1),
                            count: service.reviewCount || 0,
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-purple-600">
                        {formatPrice(service.price)}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{ts("available")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Package className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{ts("noResultsTitle")}</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== "all" || priceRange !== "all" 
                ? ts("noResultsFilters")
                : ts("noResultsEmpty")
              }
            </p>
            {(searchTerm || selectedCategory !== "all" || priceRange !== "all") && (
              <Button onClick={clearFilters}>
                {ts("clearFilters")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 