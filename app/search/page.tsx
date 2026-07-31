"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { getSearchResultImage } from "@/lib/image-utils"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useTranslations } from "next-intl"

export default function SearchPage() {
  const { formatPrice } = usePriceFormat()
  const ts = useTranslations("search")
  const th = useTranslations("header")
  const tc = useTranslations("common")
  const searchParams = useSearchParams()
  const queryParam = searchParams.get("q") || ""

  const [products, setProducts] = useState<
    {
      id: string
      name: string
      price: number
      imageUrl?: string
      media?: unknown[]
      category?: string
      description?: string
      sellerName?: string
    }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState(queryParam)

  useEffect(() => {
    if (queryParam) {
      setSearchTerm(queryParam)
      void searchProducts(queryParam)
    }
  }, [queryParam])

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const productsQuery = query(
        collection(db, "products"),
        where("name", ">=", term.toLowerCase()),
        where("name", "<=", term.toLowerCase() + "\uf8ff"),
        orderBy("name"),
        limit(50)
      )

      const productsSnapshot = await getDocs(productsQuery)
      let foundProducts = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as typeof products

      if (foundProducts.length === 0) {
        const keywordsQuery = query(
          collection(db, "products"),
          where("keywords", "array-contains", term.toLowerCase()),
          limit(50)
        )
        const keywordsSnapshot = await getDocs(keywordsQuery)
        foundProducts = keywordsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as typeof products
      }

      setProducts(foundProducts)
    } catch (error) {
      console.error("Error searching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      const url = new URL(window.location.href)
      url.searchParams.set("q", searchTerm.trim())
      window.history.pushState({}, "", url.toString())
      void searchProducts(searchTerm.trim())
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder={th("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border-gray-200 bg-gray-50 py-3 pl-10 pr-4 focus:ring-2 focus:ring-purple-400"
              />
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ts("resultsTitle")}</h1>
            {queryParam && (
              <p className="mt-1 text-gray-600">
                {loading
                  ? tc("searching")
                  : ts("searchingFor", { count: products.length, query: queryParam })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
            <p className="mt-4 text-gray-600">{ts("searchingProducts")}</p>
          </div>
        ) : products.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : "space-y-4"
            }
          >
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <Link href={`/product/${product.id}`}>
                  <div className={viewMode === "grid" ? "relative aspect-square" : "relative h-32"}>
                    <Image
                      src={getSearchResultImage(product.media as never, product.imageUrl, product.name)}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className={`p-4 ${viewMode === "list" ? "flex items-center gap-4" : ""}`}>
                    <div className="flex-1">
                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold">{product.name}</h3>
                      <p className="mb-2 text-2xl font-bold text-purple-600">{formatPrice(product.price)}</p>
                      {product.category && <p className="mb-2 text-sm text-gray-500">{product.category}</p>}
                      {product.description && (
                        <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : queryParam ? (
          <div className="py-12 text-center">
            <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">{ts("noResultsTitle")}</h2>
            <p className="mb-6 text-gray-600">{ts("noResultsDesc", { query: queryParam })}</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">{ts("suggestions")}</p>
              <ul className="space-y-1 text-sm text-gray-500">
                <li>• {ts("tipSpelling")}</li>
                <li>• {ts("tipGeneral")}</li>
                <li>• {ts("tipFewer")}</li>
              </ul>
            </div>
            <Button asChild className="mt-6 bg-purple-600 hover:bg-purple-700">
              <Link href="/products">{ts("exploreAll")}</Link>
            </Button>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">{ts("searchProductsTitle")}</h2>
            <p className="text-gray-600">{ts("searchProductsHint")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
