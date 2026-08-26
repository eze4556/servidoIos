"use client"

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { HomeProductCard } from "@/components/home/home-product-card"
import { HomeProductsSkeleton } from "@/components/home/home-skeleton"

interface ProductItem {
  id: string
  name: string
  price: number
  imageUrl?: string
  imageQuery?: string
  media?: { url: string; type: string }[]
  condition?: "nuevo" | "usado"
  freeShipping?: boolean
  shippingCost?: number
  allowResellerShare?: boolean
}

interface HomeProductCarouselProps {
  products: ProductItem[]
  loading?: boolean
  badge?: "featured" | "new"
  emptyMessage?: string
}

export function HomeProductCarousel({
  products,
  loading,
  badge,
  emptyMessage = "No hay productos para mostrar.",
}: HomeProductCarouselProps) {
  if (loading && products.length === 0) {
    return <HomeProductsSkeleton />
  }

  if (products.length === 0) {
    return <p className="text-gray-500">{emptyMessage}</p>
  }

  return (
    <div className="home-carousel-fade relative">
      <Carousel opts={{ align: "start", dragFree: true }} className="w-full px-1 lg:px-2">
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[72%] pl-4 xs:basis-[55%] sm:basis-[45%] md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
            >
              <HomeProductCard {...product} badge={badge} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-2 hidden border-0 bg-white/95 text-servido-800 shadow-lg ring-1 ring-servido-950/5 hover:bg-white hover:text-servido-950 md:flex lg:-left-3 lg:h-11 lg:w-11" />
        <CarouselNext className="-right-2 hidden border-0 bg-white/95 text-servido-800 shadow-lg ring-1 ring-servido-950/5 hover:bg-white hover:text-servido-950 md:flex lg:-right-3 lg:h-11 lg:w-11" />
      </Carousel>
    </div>
  )
}
