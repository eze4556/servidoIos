"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface BannerSlide {
  id: string
  src: string
  alt: string
  href?: string
  width: number
  height: number
}

const GUEST_BANNERS: BannerSlide[] = [
  { id: "banner1", src: "/images/banner1.png", alt: "Promoción Servido 1", href: "/products", width: 1717, height: 916 },
  { id: "banner2", src: "/images/banner2.png", alt: "Promoción Servido 2", href: "/products", width: 1717, height: 916 },
  { id: "banner3", src: "/images/banner3.png", alt: "Promoción Servido 3", href: "/signup", width: 1717, height: 916 },
]

const LOGGED_IN_BANNERS: BannerSlide[] = [
  {
    id: "bannerlogueado",
    src: "/images/bannerlogueado.png",
    alt: "Promoción para vos",
    href: "/products",
    width: 1672,
    height: 941,
  },
  {
    id: "bannerlogueado2",
    src: "/images/bannerlogueado2.png",
    alt: "Promoción exclusiva",
    href: "/dashboard/buyer",
    width: 1672,
    height: 941,
  },
]

interface HomeBannerCarouselProps {
  className?: string
  variant?: "mobile" | "desktop"
}

export function HomeBannerCarousel({ className, variant = "mobile" }: HomeBannerCarouselProps) {
  const { currentUser, authLoading } = useAuth()
  const slides = currentUser ? LOGGED_IN_BANNERS : GUEST_BANNERS
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [currentUser?.firebaseUser.uid])

  useEffect(() => {
    if (paused || slides.length <= 1 || authLoading) return
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [paused, slides.length, authLoading])

  if (authLoading) {
    return (
      <section className={cn(className)}>
        <div className="aspect-[1717/916] w-full animate-pulse rounded-2xl bg-purple-100/60" />
      </section>
    )
  }

  const current = slides[index]

  return (
    <section
      className={cn(className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 sm:rounded-3xl">
        <div className="grid w-full">
          {slides.map((slide, i) => {
            const image = (
              <Image
                src={slide.src}
                alt={slide.alt}
                width={slide.width}
                height={slide.height}
                priority={i === 0}
                className="h-auto w-full"
                sizes={
                  variant === "desktop"
                    ? "(max-width: 1280px) 90vw, 1200px"
                    : "(max-width: 768px) 100vw, 800px"
                }
              />
            )

            return (
              <div
                key={slide.id}
                className={cn(
                  "col-start-1 row-start-1 w-full transition-opacity duration-500 ease-out",
                  i === index ? "z-[1] opacity-100" : "z-0 pointer-events-none opacity-0"
                )}
                aria-hidden={i !== index}
              >
                {slide.href ? (
                  <Link href={slide.href} className="block w-full" tabIndex={i === index ? 0 : -1}>
                    {image}
                  </Link>
                ) : (
                  image
                )}
              </div>
            )
          })}
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-[2] flex items-center justify-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir al banner ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/55 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}

        <span className="sr-only">
          Banner {index + 1} de {slides.length}: {current?.alt}
        </span>
      </div>
    </section>
  )
}
