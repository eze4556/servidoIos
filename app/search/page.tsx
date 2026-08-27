"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Grid, List, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { getSearchResultImage } from "@/lib/image-utils"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useTranslations } from "next-intl"
import { HomeProductCard } from "@/components/home/home-product-card"
import { cn } from "@/lib/utils"

type SearchProduct = {
  id: string
  name: string
  price: number
  imageUrl?: string
  media?: { url: string; type: string }[]
  category?: string
  description?: string
  sellerName?: string
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
}

export default function SearchPage() {
  const { formatPrice } = usePriceFormat()
  const ts = useTranslations("search")
  const th = useTranslations("header")
  const tc = useTranslations("common")
  const searchParams = useSearchParams()
  const queryParam = searchParams.get("q") || ""

  const [products, setProducts] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState(queryParam)

  useEffect(() => {
    if (queryParam) {
      setSearchTerm(queryParam)
      void searchProducts(queryParam)
    } else {
      setLoading(false)
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
      })) as SearchProduct[]

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
        })) as SearchProduct[]
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <section className="mb-8 overflow-hidden rounded-2xl bg-servido-950 shadow-[0_24px_60px_-28px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 lg:rounded-[1.75rem]">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />

            <div className="relative mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Servido</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {ts("resultsTitle")}
              </h1>
              <form onSubmit={handleSearch} className="mt-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder={th("searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 rounded-2xl border-0 bg-white/95 pl-12 pr-4 text-servido-950 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-servido-gold/80"
                  />
                </div>
              </form>
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            {queryParam ? (
              <p className="text-sm text-slate-600 sm:text-base">
                {loading
                  ? tc("searching")
                  : ts("searchingFor", { count: products.length, query: queryParam })}
              </p>
            ) : (
              <p className="text-sm text-slate-600">{ts("searchProductsHint")}</p>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-servido-950/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-9 w-9 rounded-full p-0",
                viewMode === "grid" && "bg-servido-950 text-white hover:bg-servido-800 hover:text-white"
              )}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-9 w-9 rounded-full p-0",
                viewMode === "list" && "bg-servido-950 text-white hover:bg-servido-800 hover:text-white"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-servido-200 border-t-servido-800" />
            <p className="mt-4 text-slate-600">{ts("searchingProducts")}</p>
          </div>
        ) : products.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {products.map((product) => (
                <HomeProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  imageUrl={product.imageUrl}
                  media={product.media}
                  condition={product.condition}
                  freeShipping={product.freeShipping}
                  shippingCost={product.shippingCost}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group flex gap-4 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl lg:p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
                    <img
                      src={getSearchResultImage(product.media as never, product.imageUrl, product.name)}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <h3 className="line-clamp-2 font-semibold text-servido-950 transition-colors group-hover:text-servido-800">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-lg font-bold tracking-tight text-servido-800">
                      {formatPrice(product.price)}
                    </p>
                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : queryParam ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
            <Search className="mx-auto mb-4 h-14 w-14 text-servido-200" />
            <h2 className="mb-2 text-xl font-semibold text-servido-950">{ts("noResultsTitle")}</h2>
            <p className="mb-6 text-slate-600">{ts("noResultsDesc", { query: queryParam })}</p>
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{ts("suggestions")}</p>
              <ul className="space-y-1 text-sm text-slate-500">
                <li>• {ts("tipSpelling")}</li>
                <li>• {ts("tipGeneral")}</li>
                <li>• {ts("tipFewer")}</li>
              </ul>
            </div>
            <Button asChild className="mt-6 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]">
              <Link href="/products">{ts("exploreAll")}</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
            <Search className="mx-auto mb-4 h-14 w-14 text-servido-200" />
            <h2 className="mb-2 text-xl font-semibold text-servido-950">{ts("searchProductsTitle")}</h2>
            <p className="text-slate-600">{ts("searchProductsHint")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
