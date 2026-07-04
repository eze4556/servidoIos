"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { collection, query, getDocs, orderBy, limit, startAfter } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Loader2, Frown, Filter } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { getProductThumbnail } from "@/lib/image-utils"
import { Pagination } from "@/components/ui/pagination"
import { HomeProductCard } from "@/components/home/home-product-card"
import { ProductsCatalogHero } from "@/components/products/products-catalog-hero"
import {
  ProductsFiltersPanel,
  ProductsFiltersPanelHeader,
  type ProductsSortBy,
} from "@/components/products/products-filters-panel"

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  media?: any[]
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

const productCache = new Map<string, { data: Product[]; timestamp: number; lastDoc: any }>()
const CACHE_DURATION = 5 * 60 * 1000

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [isServiceFilter, setIsServiceFilter] = useState<boolean | "all">("all")
  const [sortBy, setSortBy] = useState<ProductsSortBy>("createdAt_desc")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const [currentPage, setCurrentPage] = useState(1)
  const [productsPerPage] = useState(20)
  const [hasMore, setHasMore] = useState(true)
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null)

  const cacheKey = useMemo(() => {
    return `${selectedCategory}-${selectedBrand}-${isServiceFilter}-${sortBy}-${debouncedSearchTerm}`
  }, [selectedCategory, selectedBrand, isServiceFilter, sortBy, debouncedSearchTerm])

  const fetchProducts = useCallback(
    async (isLoadMore = false) => {
      try {
        let productsQuery = query(collection(db, "products"))

        switch (sortBy) {
          case "price_asc":
            productsQuery = query(productsQuery, orderBy("price", "asc"))
            break
          case "price_desc":
            productsQuery = query(productsQuery, orderBy("price", "desc"))
            break
          case "name_asc":
            productsQuery = query(productsQuery, orderBy("name", "asc"))
            break
          case "name_desc":
            productsQuery = query(productsQuery, orderBy("name", "desc"))
            break
          case "createdAt_desc":
          default:
            productsQuery = query(productsQuery, orderBy("createdAt", "desc"))
            break
        }

        if (isLoadMore && lastVisibleDoc) {
          productsQuery = query(productsQuery, startAfter(lastVisibleDoc), limit(productsPerPage))
        } else {
          productsQuery = query(productsQuery, limit(productsPerPage))
        }

        const productSnapshot = await getDocs(productsQuery)
        const fetchedProducts = productSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Product
        )

        if (isLoadMore) {
          setProducts((prev) => [...prev, ...fetchedProducts])
        } else {
          setProducts(fetchedProducts)
          setCurrentPage(1)
        }

        setLastVisibleDoc(productSnapshot.docs[productSnapshot.docs.length - 1])
        setHasMore(fetchedProducts.length === productsPerPage)

        productCache.set(cacheKey, {
          data: isLoadMore ? [...products, ...fetchedProducts] : fetchedProducts,
          timestamp: Date.now(),
          lastDoc: productSnapshot.docs[productSnapshot.docs.length - 1],
        })
      } catch (err) {
        console.error("Error fetching products:", err)
        setError("Error al cargar los productos. Intenta de nuevo más tarde.")
      }
    },
    [sortBy, lastVisibleDoc, productsPerPage, cacheKey, products]
  )

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const cached = productCache.get(cacheKey)
        const now = Date.now()

        if (cached && now - cached.timestamp < CACHE_DURATION) {
          setProducts(cached.data)
          setFilteredProducts(cached.data)
          setLastVisibleDoc(cached.lastDoc)
          setLoading(false)
          return
        }

        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
        const categorySnapshot = await getDocs(categoriesQuery)
        setCategories(
          categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category)
        )

        const brandsQuery = query(collection(db, "brands"), orderBy("name"))
        const brandSnapshot = await getDocs(brandsQuery)
        setBrands(
          brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Brand)
        )

        await fetchProducts()
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Error al cargar los datos. Intenta de nuevo más tarde.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [cacheKey, fetchProducts])

  const loadMoreProducts = useCallback(() => {
    if (hasMore && !loading) {
      fetchProducts(true)
    }
  }, [hasMore, loading, fetchProducts])

  useEffect(() => {
    let filtered = [...products]

    if (debouncedSearchTerm) {
      const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          product.description?.toLowerCase().includes(lowerCaseSearchTerm)
      )
    }

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    if (selectedBrand && selectedBrand !== "all") {
      filtered = filtered.filter((product) => product.brand === selectedBrand)
    }

    const minP = Number.parseFloat(minPrice)
    const maxP = Number.parseFloat(maxPrice)
    if (!isNaN(minP) && minP >= 0) {
      filtered = filtered.filter((product) => product.price >= minP)
    }
    if (!isNaN(maxP) && maxP >= 0) {
      filtered = filtered.filter((product) => product.price <= maxP)
    }

    if (isServiceFilter !== "all") {
      filtered = filtered.filter((product) => product.isService === isServiceFilter)
    }

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [products, debouncedSearchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, isServiceFilter])

  useEffect(() => {
    setCurrentPage(1)
    setLastVisibleDoc(null)
    setHasMore(true)
  }, [cacheKey])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setSelectedBrand("all")
    setMinPrice("")
    setMaxPrice("")
    setIsServiceFilter("all")
    setSortBy("createdAt_desc")
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (selectedCategory && selectedCategory !== "all") count++
    if (selectedBrand && selectedBrand !== "all") count++
    if (minPrice) count++
    if (maxPrice) count++
    if (isServiceFilter !== "all") count++
    return count
  }, [searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, isServiceFilter])

  const activeFilters = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = []
    if (searchTerm) chips.push({ label: `"${searchTerm}"`, onRemove: () => setSearchTerm("") })
    if (selectedCategory && selectedCategory !== "all") {
      const name = categories.find((c) => c.id === selectedCategory)?.name || "Categoría"
      chips.push({ label: name, onRemove: () => setSelectedCategory("all") })
    }
    if (selectedBrand && selectedBrand !== "all") {
      const name = brands.find((b) => b.id === selectedBrand)?.name || "Marca"
      chips.push({ label: name, onRemove: () => setSelectedBrand("all") })
    }
    if (minPrice) chips.push({ label: `Desde $${minPrice}`, onRemove: () => setMinPrice("") })
    if (maxPrice) chips.push({ label: `Hasta $${maxPrice}`, onRemove: () => setMaxPrice("") })
    if (isServiceFilter === true) chips.push({ label: "Servicios", onRemove: () => setIsServiceFilter("all") })
    if (isServiceFilter === false) chips.push({ label: "Productos", onRemove: () => setIsServiceFilter("all") })
    return chips
  }, [searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, isServiceFilter, categories, brands])

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const startIndex = (currentPage - 1) * productsPerPage
  const endIndex = startIndex + productsPerPage
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const filterPanelProps = {
    searchTerm,
    onSearchTermChange: setSearchTerm,
    debouncedSearchTerm,
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    selectedBrand,
    onBrandChange: setSelectedBrand,
    minPrice,
    onMinPriceChange: setMinPrice,
    maxPrice,
    onMaxPriceChange: setMaxPrice,
    isServiceFilter,
    onServiceFilterChange: setIsServiceFilter,
    sortBy,
    onSortByChange: setSortBy,
    categories,
    brands,
    onClearFilters: handleClearFilters,
    resultCount: loading ? undefined : filteredProducts.length,
  }

  const resultLabel =
    filteredProducts.length === 1
      ? "1 producto encontrado"
      : `${filteredProducts.length} productos encontrados`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <ProductsCatalogHero
          categories={categories}
          totalCount={loading ? undefined : filteredProducts.length}
        />

        <div className="mb-4 lg:hidden">
          <Button
            variant="outline"
            onClick={() => setMobileFiltersOpen(true)}
            className="w-full rounded-xl border-purple-200 text-purple-800 hover:bg-purple-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros y orden
            {activeFilterCount > 0 && (
              <span className="ml-2 rounded-full bg-purple-700 px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left" className="flex w-full max-w-sm flex-col border-r-0 p-0 sm:max-w-md">
            <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-violet-900 px-5 py-5 text-white">
              <SheetTitle className="text-left text-lg font-bold">Filtros</SheetTitle>
              <p className="mt-1 text-sm text-purple-200">
                {loading
                  ? "Cargando catálogo..."
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? "resultado" : "resultados"}`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ProductsFiltersPanel {...filterPanelProps} />
            </div>
            <div className="border-t border-gray-100 bg-white p-4">
              <Button
                className="w-full rounded-full bg-purple-700 hover:bg-purple-800"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Ver {filteredProducts.length} {filteredProducts.length === 1 ? "resultado" : "resultados"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-36 overflow-hidden rounded-2xl bg-white shadow-lg shadow-purple-900/5 ring-1 ring-gray-100">
              <div className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50 px-5 py-4">
                <ProductsFiltersPanelHeader activeCount={activeFilterCount} />
              </div>
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
                <ProductsFiltersPanel {...filterPanelProps} />
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {!loading && !error && filteredProducts.length > 0 && (
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-800">
                    {resultLabel}
                  </span>
                  {activeFilters.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-purple-50 hover:text-purple-800"
                    >
                      {chip.label}
                      <span className="text-gray-400">×</span>
                    </button>
                  ))}
                </div>
                <p className="hidden text-xs text-gray-400 lg:block">Actualización cada 5 min</p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100"
                  >
                    <div className="aspect-square animate-pulse bg-gray-200" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                      <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
                <Frown className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-lg text-gray-600">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
                <Frown className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-lg text-gray-600">No se encontraron productos con los filtros aplicados.</p>
                <Button
                  onClick={handleClearFilters}
                  className="mt-4 rounded-full bg-purple-700 hover:bg-purple-800"
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                  {currentProducts.map((product) => (
                    <HomeProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      imageUrl={getProductThumbnail(product.media, product.imageUrl, product.name)}
                      media={product.media}
                      condition={product.condition}
                      freeShipping={product.freeShipping}
                      shippingCost={product.shippingCost}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      maxVisiblePages={7}
                      showPageInfo={true}
                    />
                  </div>
                )}

                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      onClick={loadMoreProducts}
                      disabled={loading}
                      variant="outline"
                      className="rounded-full border-purple-200 px-8 text-purple-800 hover:bg-purple-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        "Cargar más productos"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
