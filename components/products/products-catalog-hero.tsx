import Link from "next/link"
import Image from "next/image"
import { Package } from "lucide-react"

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
    <section className="mb-8 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 sm:rounded-3xl">
      <Image
        src="/images/bannernuevooficial.jpeg"
        alt="Encontrá la tecnología ideal para vos"
        width={1600}
        height={724}
        className="h-auto w-full"
        sizes="(max-width: 1280px) calc(100vw - 2rem), 1200px"
        priority
      />

      {(categories.length > 0 || (typeof totalCount === "number" && totalCount > 0)) && (
        <div className="space-y-3 border-t border-gray-100 p-4 sm:p-5">
          {typeof totalCount === "number" && totalCount > 0 && (
            <p className="text-sm font-medium text-gray-600">
              {totalCount} {totalCount === 1 ? "resultado disponible" : "resultados disponibles"}
            </p>
          )}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-800 transition-all hover:bg-purple-100"
              >
                <Package className="h-3.5 w-3.5" />
                {category.name}
              </Link>
            ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
