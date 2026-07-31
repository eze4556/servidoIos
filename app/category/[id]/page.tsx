"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { getProductThumbnail } from "@/lib/image-utils"
import { formatPrice } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  media?: any[]
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

export default function CategoryProductsPage() {
  const tc = useTranslations("categoryPage")
  const tp = useTranslations("product")
  const tr = useTranslations("reviews")
  const params = useParams()
  const router = useRouter()

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchCategoryAndProducts(params.id as string)
    }
  }, [params.id])

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
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("errorTitle")}</AlertTitle>
          <AlertDescription>{error || tc("notFound")}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/">{tc("backHome")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-blue-600">
                {tc("home")}
              </Link>
              <span>/</span>
              <span className="truncate text-gray-900">{category.name}</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{tc("titleInCategory", { name: category.name })}</h1>
        {category.description && <p className="mb-8 text-gray-600">{category.description}</p>}

        {products.length === 0 ? (
          <div className="py-10 text-center">
            <p className="mb-6 text-lg text-muted-foreground">{tc("empty")}</p>
            <Button asChild>
              <Link href="/">{tc("exploreOthers")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="block">
                <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={getProductThumbnail(product.media, product.imageUrl, product.name)}
                      alt={product.name}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <CardContent className="flex flex-grow flex-col p-3">
                    <h3 className="mb-1 h-10 truncate text-sm font-medium leading-tight">{product.name}</h3>
                    <p className="mb-2 text-lg font-semibold text-blue-600">{formatPrice(product.price)}</p>
                    {product.condition && (
                      <span className="mb-1 text-xs font-medium text-gray-700">
                        {product.condition === "nuevo" ? tp("new") : tp("used")}
                      </span>
                    )}
                    {product.freeShipping ? (
                      <span className="text-xs text-green-600">{tp("freeShipping")}</span>
                    ) : (
                      <span className="text-xs text-gray-600">
                        {tc("shippingCost")}{" "}
                        {product.shippingCost !== undefined ? formatPrice(product.shippingCost) : "-"}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
