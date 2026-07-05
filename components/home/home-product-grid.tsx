import { HomeProductCard } from "@/components/home/home-product-card"

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  imageQuery?: string
  media?: { url: string; type: string }[]
  category?: string
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
}

interface HomeProductGridProps {
  products: Product[]
  loading?: boolean
  title?: string
  emptyMessage?: string
}

export function HomeProductGrid({
  products,
  loading,
  title = "Productos",
  emptyMessage = "No hay productos para mostrar.",
}: HomeProductGridProps) {
  return (
    <section>
      {title && <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
              <div className="aspect-square animate-pulse bg-gray-200" />
              <div className="space-y-2 p-3">
                <div className="h-3 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {products.map((product) => (
            <HomeProductCard key={product.id} {...product} badge="featured" />
          ))}
        </div>
      )}
    </section>
  )
}
