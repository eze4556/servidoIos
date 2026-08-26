"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Package } from "lucide-react"
import { useTranslations } from "next-intl"

interface CategoryChip {
  id: string
  name: string
}

interface ProductsCatalogHeroProps {
  categories?: CategoryChip[]
  totalCount?: number
}

export function ProductsCatalogHero({ categories = [], totalCount }: ProductsCatalogHeroProps) {
  const tp = useTranslations("products")

  return (
    <section className="mb-8 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-servido-950/5 sm:rounded-3xl lg:mb-10 lg:rounded-[1.75rem] lg:shadow-[0_24px_60px_-28px_rgba(46,16,101,0.28)]">
      <div className="relative">
        <Image
          src="/images/bannernuevooficial.jpeg"
          alt={tp("bannerAlt")}
          width={1600}
          height={724}
          className="h-auto w-full"
          sizes="(max-width: 1280px) calc(100vw - 2rem), 1200px"
          priority
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-servido-950/35 to-transparent lg:block" />
        <div className="pointer-events-none absolute bottom-5 left-6 hidden lg:block">
          <p className="font-serif text-3xl font-semibold tracking-tight text-white drop-shadow">
            Servido
            <span className="text-servido-gold">.</span>
          </p>
          <p className="mt-1 text-sm text-white/85">{tp("catalogHeroSubtitle")}</p>
        </div>
      </div>

      {(categories.length > 0 || (typeof totalCount === "number" && totalCount > 0)) && (
        <div className="space-y-3 border-t border-servido-950/5 p-4 sm:p-5 lg:px-6 lg:py-5">
          {typeof totalCount === "number" && totalCount > 0 && (
            <p className="text-sm font-medium text-slate-600">
              {totalCount}{" "}
              {totalCount === 1 ? tp("resultAvailable") : tp("resultsAvailable")}
            </p>
          )}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.id}`}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-servido-50 px-4 py-2 text-sm font-medium text-servido-900 transition-all hover:bg-servido-100"
                >
                  <Package className="h-3.5 w-3.5" />
                  {category.name}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
