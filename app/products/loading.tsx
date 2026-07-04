import { Skeleton } from "@/components/ui/skeleton"
import { ProductsCatalogHero } from "@/components/products/products-catalog-hero"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <ProductsCatalogHero />

        <div className="mb-4 lg:hidden">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
              <Skeleton className="h-14 w-full" />
              <div className="space-y-5 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-3 w-20" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div>
            <Skeleton className="mb-5 h-8 w-48 rounded-full" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100"
                >
                  <Skeleton className="aspect-square w-full" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
