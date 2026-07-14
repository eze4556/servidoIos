"use client"

import React, { useEffect, useState, useMemo } from "react"
import { AlertCircle, LayoutGrid, Sparkles, Star, Tag } from "lucide-react"
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { HomeSectionHeader } from "@/components/home/home-section-header"
import { HomeSearchHero } from "@/components/home/home-search-hero"
import { HomeAnimatedPromo } from "@/components/home/home-animated-promo"
import { HomeCategoriesShowcase } from "@/components/home/home-categories-showcase"
import { HomeProductCarousel } from "@/components/home/home-product-carousel"
import { HomeBrandsShowcase } from "@/components/home/home-brands-showcase"
import { HomeSectionShell } from "@/components/home/home-section-shell"
import { HomeMobileHero } from "@/components/home/home-mobile-hero"
import { HomeCategoryPills } from "@/components/home/home-category-pills"
import { HomeBannerCarousel } from "@/components/home/home-banner-carousel"
import { HomeStoriesSection } from "@/components/stories/home-stories-section"
import { HomeProductGrid } from "@/components/home/home-product-grid"

interface Product {
  id: string
  name: string
  price: number
  imageQuery?: string
  imageUrl?: string
  category?: string
  description?: string
  media?: { url: string; type: string }[]
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
}

interface CategoryItem {
  id: string
  name: string
  iconQuery?: string
  imageUrl?: string
}

interface BrandItem {
  id: string
  name: string
  logoQuery?: string
  imageUrl?: string
}

interface OfferAlert {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  isActive: boolean
  startDate?: any
  endDate?: any
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [activeAlert, setActiveAlert] = useState<OfferAlert | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        const featuredQuery = query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          limit(10)
        )
        const featuredSnapshot = await getDocs(featuredQuery)
        const featuredData = featuredSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
        setFeaturedProducts(featuredData)

        const newQuery = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(10))
        const newSnapshot = await getDocs(newQuery)
        const newData = newSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
        setNewProducts(newData)

        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
        const categoriesSnapshot = await getDocs(categoriesQuery)
        const categoriesData = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CategoryItem[]
        setCategories(categoriesData)

        const brandsQuery = query(collection(db, "brands"), orderBy("name"))
        const brandsSnapshot = await getDocs(brandsQuery)
        const brandsData = brandsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BrandItem[]
        setBrands(brandsData)

        const recentlyViewed = localStorage.getItem("recentlyViewedProducts")
        if (recentlyViewed) {
          const recentIds = JSON.parse(recentlyViewed).slice(0, 5)
          if (recentIds.length > 0) {
            const recentProducts = await Promise.all(
              recentIds.map(async (id: string) => {
                const doc = await getDocs(
                  query(collection(db, "products"), where("__name__", "==", id))
                )
                if (!doc.empty) {
                  return { id: doc.docs[0].id, ...doc.docs[0].data() } as Product
                }
                return null
              })
            )
            setRecentlyViewedProducts(recentProducts.filter(Boolean) as Product[])
          }
        }

        const alertsQuery = query(collection(db, "alerts"), orderBy("createdAt", "desc"), limit(1))
        const alertsSnapshot = await getDocs(alertsQuery)
        if (!alertsSnapshot.empty) {
          const alertData = alertsSnapshot.docs[0].data() as OfferAlert
          const now = new Date()
          const startDate = alertData.startDate?.toDate?.() || new Date(0)
          const endDate =
            alertData.endDate?.toDate?.() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

          if (now >= startDate && now <= endDate) {
            const seen = localStorage.getItem(`servido-alert-${alertsSnapshot.docs[0].id}`)
            if (!seen) {
              setActiveAlert({ ...alertData, id: alertsSnapshot.docs[0].id })
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  const handleOpenAlert = () => {
    setShowAlert(true)
    if (activeAlert) {
      localStorage.setItem(`servido-alert-${activeAlert.id}`, "seen")
    }
  }

  const handleCloseAlert = () => {
    setShowAlert(false)
    setActiveAlert(null)
  }

  const searchChips = useMemo(() => {
    if (categories.length === 0) return undefined

    const fromCategories = categories.slice(0, 4).map((category) => ({
      label: category.name,
      href: `/category/${category.id}`,
    }))

    return [...fromCategories.slice(0, 3), { label: "Servicios", href: "/services" }]
  }, [categories])

  const mobileGridProducts = useMemo(() => {
    if (selectedCategoryId === "all") return featuredProducts

    const category = categories.find((c) => c.id === selectedCategoryId)
    if (!category) return featuredProducts

    return featuredProducts.filter(
      (p) => p.category === category.id || p.category === category.name
    )
  }, [featuredProducts, selectedCategoryId, categories])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-purple-50/40 text-gray-900">
      {/* Mobile app-style home */}
      <div className="lg:hidden">
        <HomeMobileHero />

        <div className="space-y-6 px-4 pb-8 pt-5">
          <div>
            <h2 className="mb-3 text-lg font-bold text-gray-900">Productos</h2>
            <HomeCategoryPills
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </div>

          <HomeProductGrid
            products={mobileGridProducts}
            loading={loadingData}
            title=""
            emptyMessage="No hay productos en esta categoría."
          />

          <HomeSectionShell variant="default">
            <HomeSectionHeader
              title="Categorías"
              subtitle="Explorá por rubro"
              href="/products"
              linkText="Ver todas"
              icon={LayoutGrid}
              accent="purple"
            />
            <HomeCategoriesShowcase categories={categories} loading={loadingData} />
          </HomeSectionShell>

          <HomeSectionShell variant="tinted">
            <HomeSectionHeader
              title="Nuestras Marcas"
              subtitle="Las mejores del mercado"
              icon={Tag}
              accent="purple"
            />
            <HomeBrandsShowcase brands={brands} loading={loadingData} />
          </HomeSectionShell>
        </div>
      </div>

      {/* Desktop home */}
      <div className="hidden lg:block">
        <HomeSearchHero chips={searchChips} />

        <div className="container mx-auto max-w-screen-xl px-4 pt-4 md:px-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Historias</h2>
            <a href="/historias" className="text-xs font-medium text-servido-800 hover:underline">
              Ver todas
            </a>
          </div>
          <HomeStoriesSection />
        </div>

        <div className="container mx-auto max-w-screen-xl px-4 pt-4 md:px-6">
          <HomeBannerCarousel variant="desktop" />
        </div>

        <HomeSectionShell variant="default" className="home-section-delay-1">
          <HomeSectionHeader
            title="Categorías"
            subtitle="Explorá por rubro y encontrá lo que necesitás"
            href="/products"
            linkText="Ver todas"
            icon={LayoutGrid}
            accent="purple"
          />
          <HomeCategoriesShowcase categories={categories} loading={loadingData} />
        </HomeSectionShell>

        <HomeAnimatedPromo />

        <HomeSectionShell variant="tinted" className="home-section-delay-2">
          <HomeSectionHeader
            title="Productos Destacados"
            subtitle="Los más elegidos de la semana"
            href="/products"
            linkText="Ver destacados"
            icon={Star}
            accent="amber"
          />
          <HomeProductCarousel
            products={featuredProducts}
            loading={loadingData}
            badge="featured"
            emptyMessage="No hay productos destacados en este momento."
          />
        </HomeSectionShell>

        <HomeSectionShell variant="elevated" className="home-section-delay-3">
          <HomeSectionHeader
            title="Productos Nuevos"
            subtitle="Recién publicados en el marketplace"
            href="/products"
            linkText="Ver catálogo"
            icon={Sparkles}
            accent="emerald"
          />
          <HomeProductCarousel
            products={newProducts}
            loading={loadingData}
            badge="new"
            emptyMessage="No hay productos nuevos en este momento."
          />
        </HomeSectionShell>

        {recentlyViewedProducts.length > 0 && (
          <HomeSectionShell variant="default">
            <HomeSectionHeader
              title="Vistos recientemente"
              subtitle="Retomá donde lo dejaste"
              accent="purple"
            />
            <HomeProductCarousel products={recentlyViewedProducts} />
          </HomeSectionShell>
        )}

        <HomeSectionShell variant="tinted">
          <HomeSectionHeader
            title="Nuestras Marcas"
            subtitle="Trabajamos con las mejores del mercado"
            icon={Tag}
            accent="purple"
          />
          <HomeBrandsShowcase brands={brands} loading={loadingData} />
        </HomeSectionShell>
      </div>

      {activeAlert && !showAlert && (
        <button
          onClick={handleOpenAlert}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-servido-700 to-servido-950 text-white shadow-lg shadow-servido-700/40 transition-all duration-300 hover:scale-110 hover:shadow-xl lg:bottom-6 lg:right-6"
          aria-label="Ver alerta"
        >
          <AlertCircle className="h-8 w-8 animate-pulse" />
        </button>
      )}

      {showAlert && activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">{activeAlert.title}</h3>
            <p className="mb-6 text-gray-600">{activeAlert.message}</p>
            <button
              onClick={handleCloseAlert}
              className="w-full rounded-xl bg-gradient-to-r from-servido-700 to-servido-950 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
