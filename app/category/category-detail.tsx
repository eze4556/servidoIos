"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertCircle, Loader2, Package } from "lucide-react"
import { HomeProductCard } from "@/components/home/home-product-card"
import { useRouteId } from "@/hooks/use-route-id"

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  media?: { url: string; type: string }[]
  imageQuery?: string
  category?: string
  description?: string
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
}

interface Category {
  id: string
  name: string
  description?: string
}

export function CategoryDetail() {
  const tc = useTranslations("categoryPage")
  const tr = useTranslations("reviews")
  const categoryId = useRouteId()
  const router = useRouter()

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (categoryId) {
      void fetchCategoryAndProducts(categoryId)
    }
  }, [categoryId])

  const fetchCategoryAndProducts = async (categoryId: string) => {
    setLoading(true)
    setError(null)
    try {
      const categoryDoc = await getDoc(doc(db, "categories", categoryId))

      if (!categoryDoc.exists()) {
        setError(tc("notFound"))
        setLoading(false)
        return
      }

      setCategory({ id: categoryDoc.id, ...categoryDoc.data() } as Category)

      const productsQuery = query(
        collection(db, "products"),
        where("category", "==", categoryId),
        orderBy("createdAt", "desc"),
        limit(20)
      )
      const productSnapshot = await getDocs(productsQuery)
      setProducts(productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product))
    } catch (err) {
      console.error("Error fetching category products:", err)
      setError(tc("loadError"))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Loader2 className="h-12 w-12 animate-spin text-servido-800" />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <Alert variant="destructive" className="max-w-md rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("errorTitle")}</AlertTitle>
          <AlertDescription>{error || tc("notFound")}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4 rounded-full bg-servido-950 hover:bg-servido-800">
          <Link href="/">{tc("backHome")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0 rounded-full hover:bg-servido-50 hover:text-servido-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <Link href="/" className="rounded-lg px-2 py-1 transition-colors hover:bg-servido-50 hover:text-servido-800">
              {tc("home")}
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/products"
              className="rounded-lg px-2 py-1 transition-colors hover:bg-servido-50 hover:text-servido-800"
            >
              {tc("products")}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="truncate font-medium text-servido-950">{category.name}</span>
          </nav>
        </div>

        <section className="mb-8 overflow-hidden rounded-2xl bg-servido-950 shadow-[0_24px_60px_-28px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 lg:mb-10 lg:rounded-[1.75rem]">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                {tc("home")} · {category.name}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {tc("titleInCategory", { name: category.name })}
              </h1>
              {category.description && (
                <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">{category.description}</p>
              )}
              <p className="mt-4 text-sm font-medium text-servido-gold">
                {products.length === 1
                  ? tc("productCount", { count: products.length })
                  : tc("productCountPlural", { count: products.length })}
              </p>
            </div>
          </div>
        </section>

        {products.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
            <Package className="mx-auto mb-4 h-14 w-14 text-servido-200" />
            <p className="mb-6 text-lg text-slate-600">{tc("empty")}</p>
            <Button asChild className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]">
              <Link href="/">{tc("exploreOthers")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5">
            {products.map((product) => (
              <HomeProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                imageUrl={product.imageUrl}
                imageQuery={product.imageQuery}
                media={product.media}
                condition={product.condition}
                freeShipping={product.freeShipping}
                shippingCost={product.shippingCost}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
