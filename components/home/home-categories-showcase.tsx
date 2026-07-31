"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
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
  const th = useTranslations("home")
  const tc = useTranslations("common")

  if (loading && categories.length === 0) {
    return <HomeCategoriesSkeleton />
  }

  if (categories.length === 0) {
    return <p className="text-gray-500">{tc("noCategories")}</p>
  }

  return (
    <>
      <div className="home-carousel-fade relative">
        <Carousel opts={{ align: "start", dragFree: true }} className="w-full px-1 lg:px-2">
          <CarouselContent className="-ml-4">
            {categories.map((category) => (
              <CarouselItem
                key={category.id}
                className="basis-[70%] pl-4 xs:basis-[55%] sm:basis-[45%] md:basis-1/3 lg:basis-1/5"
              >
                <HomeCategoryCard {...category} variant="tile" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-1 border-0 bg-white/95 shadow-md sm:-left-2 md:flex lg:-left-3" />
          <CarouselNext className="-right-1 border-0 bg-white/95 shadow-md sm:-right-2 md:flex lg:-right-3" />
        </Carousel>
      </div>

      <div className="mt-6 flex justify-center lg:hidden">
        <Link
          href="/products"
          className="text-sm font-medium text-purple-700 underline-offset-4 hover:underline"
        >
          {th("seeAllCategories")}
        </Link>
      </div>
    </>
  )
}
