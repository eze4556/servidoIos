"use client"

import Link from "next/link"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { HomeCategoryCard } from "@/components/home/home-category-card"
import { HomeCategoriesSkeleton } from "@/components/home/home-skeleton"

interface CategoryItem {
  id: string
  name: string
  imageUrl?: string
  iconQuery?: string
}

interface HomeCategoriesShowcaseProps {
  categories: CategoryItem[]
  loading?: boolean
}

export function HomeCategoriesShowcase({ categories, loading }: HomeCategoriesShowcaseProps) {
  if (loading && categories.length === 0) {
    return <HomeCategoriesSkeleton />
  }

  if (categories.length === 0) {
    return <p className="text-gray-500">No hay categorías disponibles.</p>
  }

  return (
    <>
      <div className="hidden gap-4 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {categories.map((category) => (
          <HomeCategoryCard key={category.id} {...category} variant="tile" />
        ))}
      </div>

      <div className="home-carousel-fade relative sm:hidden">
        <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
          <CarouselContent className="-ml-4">
            {categories.map((category) => (
              <CarouselItem key={category.id} className="basis-[70%] pl-4 xs:basis-[55%]">
                <HomeCategoryCard {...category} variant="tile" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-1 border-0 bg-white/95 shadow-md" />
          <CarouselNext className="-right-1 border-0 bg-white/95 shadow-md" />
        </Carousel>
      </div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          href="/products"
          className="text-sm font-medium text-purple-700 underline-offset-4 hover:underline"
        >
          Ver todas las categorías
        </Link>
      </div>
    </>
  )
}
