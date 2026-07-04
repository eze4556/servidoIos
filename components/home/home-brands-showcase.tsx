"use client"

import { SimpleImage } from "@/components/ui/simple-image"

interface BrandItem {
  id: string
  name: string
  imageUrl?: string
  logoQuery?: string
}

interface HomeBrandsShowcaseProps {
  brands: BrandItem[]
  loading?: boolean
}

export function HomeBrandsShowcase({ brands, loading }: HomeBrandsShowcaseProps) {
  if (loading && brands.length === 0) {
    return <div className="h-28 animate-pulse rounded-3xl bg-purple-100/50" />
  }

  if (brands.length === 0) {
    return <p className="text-center text-gray-500">No hay marcas para mostrar.</p>
  }

  const loop = brands.concat(brands)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-purple-100/80 bg-gradient-to-br from-white via-purple-50/30 to-white p-6 shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

      <div
        className="flex w-max animate-infinite-scroll items-center gap-6"
        style={{ "--scroll-speed": "35s" } as React.CSSProperties}
      >
        {loop.map((brand, index) => (
          <div
            key={`${brand.id}-${index}`}
            className="group flex h-20 w-36 shrink-0 flex-col items-center justify-center rounded-2xl bg-white px-4 shadow-md ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-purple-200"
          >
            <SimpleImage
              src={
                brand.imageUrl ||
                `/placeholder.svg?height=60&width=100&query=${brand.logoQuery || brand.name + " logo"}&color=gray`
              }
              alt={brand.name}
              width={100}
              height={48}
              className="max-h-10 object-contain opacity-80 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
            />
            <span className="mt-2 truncate text-xs font-medium text-gray-500 group-hover:text-purple-700">
              {brand.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
