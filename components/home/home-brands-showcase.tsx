"use client"

import { useTranslations } from "next-intl"
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
  const th = useTranslations("home")

  if (loading && brands.length === 0) {
    return <div className="h-28 animate-pulse rounded-3xl bg-purple-100/50" />
  }

  if (brands.length === 0) {
    return <p className="text-center text-gray-500">{th("noBrands")}</p>
  }

  const loop = brands.concat(brands)

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-servido-950/5 bg-gradient-to-br from-white via-servido-50/30 to-white p-5 shadow-[0_18px_40px_-28px_rgba(46,16,101,0.28)] lg:p-7">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent lg:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent lg:w-20" />

      <div
        className="flex w-max animate-infinite-scroll items-center gap-5 lg:gap-7"
        style={{ "--scroll-speed": "35s" } as React.CSSProperties}
      >
        {loop.map((brand, index) => (
          <div
            key={`${brand.id}-${index}`}
            className="group flex h-20 w-36 shrink-0 flex-col items-center justify-center rounded-2xl bg-white px-4 shadow-sm ring-1 ring-servido-950/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:ring-servido-800/15 lg:h-24 lg:w-40"
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
            <span className="mt-2 truncate text-xs font-medium text-slate-500 group-hover:text-servido-800">
              {brand.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
