import Link from "next/link"
import { Package, Sparkles } from "lucide-react"

interface CategoryChip {
  id: string
  name: string
}

interface ProductsCatalogHeroProps {
  categories?: CategoryChip[]
  totalCount?: number
}

export function ProductsCatalogHero({ categories = [], totalCount }: ProductsCatalogHeroProps) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-purple-800 to-violet-900 px-6 py-8 shadow-xl shadow-purple-900/20 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative z-10">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-100 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Catálogo
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          Explorá productos y servicios
        </h1>
        <p className="mt-2 max-w-xl text-sm text-purple-100 sm:text-base">
          Filtrá por categoría, marca o precio y encontrá lo que necesitás en el marketplace.
        </p>
        {typeof totalCount === "number" && totalCount > 0 && (
          <p className="mt-3 text-sm font-medium text-purple-200">
            {totalCount} {totalCount === 1 ? "resultado disponible" : "resultados disponibles"}
          </p>
        )}

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Package className="h-3.5 w-3.5" />
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
