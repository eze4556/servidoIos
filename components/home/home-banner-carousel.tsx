"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
  const [controlsVisible, setControlsVisible] = useState(false)
  const hideControlsTimer = useRef<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    active: boolean
    startX: number
    scrollLeft: number
    moved: boolean
  }>({ active: false, startX: 0, scrollLeft: 0, moved: false })

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimer.current != null) {
      window.clearTimeout(hideControlsTimer.current)
      hideControlsTimer.current = null
    }
  }, [])

  const showControls = useCallback(() => {
    clearHideControlsTimer()
    setControlsVisible(true)
  }, [clearHideControlsTimer])

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimer()
    hideControlsTimer.current = window.setTimeout(() => {
      setControlsVisible(false)
      hideControlsTimer.current = null
    }, 2200)
  }, [clearHideControlsTimer])

  useEffect(() => {
    return () => clearHideControlsTimer()
  }, [clearHideControlsTimer])

  useEffect(() => {
    setIndex(0)
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: 0, behavior: "auto" })
  }, [currentUser?.firebaseUser.uid])

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || slides.length === 0) return
    const width = el.clientWidth
    if (width <= 0) return
    const next = Math.round(el.scrollLeft / width)
    setIndex(Math.max(0, Math.min(slides.length - 1, next)))
  }, [slides.length])

  const goTo = useCallback((next: number) => {
    const el = scrollerRef.current
    if (!el) return
    const clamped = ((next % slides.length) + slides.length) % slides.length
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" })
    setIndex(clamped)
  }, [slides.length])

  const stepBy = useCallback(
    (delta: number) => {
      setPaused(true)
      goTo(index + delta)
      window.setTimeout(() => setPaused(false), 2500)
    },
    [goTo, index]
  )

  useEffect(() => {
    if (paused || slides.length <= 1 || authLoading) return
    const timer = window.setInterval(() => {
      const el = scrollerRef.current
      if (!el) return
      const width = el.clientWidth
      const current = Math.round(el.scrollLeft / width)
      const next = (current + 1) % slides.length
      el.scrollTo({ left: next * width, behavior: "smooth" })
    }, 4500)
    return () => window.clearInterval(timer)
  }, [paused, slides.length, authLoading])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    const el = scrollerRef.current
    if (!el) return
    setPaused(true)
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag.active) return
    const delta = e.clientX - drag.startX
    if (Math.abs(delta) > 6) drag.moved = true
    el.scrollLeft = drag.scrollLeft - delta
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag.active) return
    drag.active = false
    try {
      el.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    // Snap al slide más cercano
    const width = el.clientWidth
    const nearest = Math.round(el.scrollLeft / width)
    el.scrollTo({ left: nearest * width, behavior: "smooth" })
    setIndex(Math.max(0, Math.min(slides.length - 1, nearest)))
    window.setTimeout(() => setPaused(false), 800)
  }

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
      onMouseEnter={() => {
        setPaused(true)
        showControls()
      }}
      onMouseLeave={() => {
        setPaused(false)
        clearHideControlsTimer()
        setControlsVisible(false)
      }}
      onFocusCapture={showControls}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          scheduleHideControls()
        }
      }}
    >
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 sm:rounded-3xl"
        onTouchStart={() => {
          setPaused(true)
          showControls()
        }}
        onTouchEnd={() => {
          window.setTimeout(() => setPaused(false), 800)
          scheduleHideControls()
        }}
      >
        <div
          ref={scrollerRef}
          className="flex w-full cursor-grab touch-pan-y overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
          onScroll={syncIndexFromScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {slides.map((slide, i) => {
            const image = (
              <Image
                src={slide.src}
                alt={slide.alt}
                width={slide.width}
                height={slide.height}
                priority={i === 0}
                draggable={false}
                className="pointer-events-none h-auto w-full select-none"
                sizes={
                  variant === "desktop"
                    ? "(max-width: 1280px) 90vw, 1200px"
                    : "(max-width: 768px) 100vw, 800px"
                }
              />
            )

            return (
              <div key={slide.id} className="w-full shrink-0 snap-center snap-always">
                {slide.href ? (
                  <Link
                    href={slide.href}
                    className="block w-full"
                    draggable={false}
                    onClick={(e) => {
                      // Si el usuario estaba arrastrando, no navegar
                      if (dragRef.current.moved) {
                        e.preventDefault()
                        dragRef.current.moved = false
                      }
                    }}
                  >
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
          <>
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label="Banner anterior"
              className={cn(
                "absolute left-2 top-1/2 z-[3] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-black/60 active:scale-95 sm:left-3 sm:h-10 sm:w-10",
                controlsVisible
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              )}
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label="Banner siguiente"
              className={cn(
                "absolute right-2 top-1/2 z-[3] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-black/60 active:scale-95 sm:right-3 sm:h-10 sm:w-10",
                controlsVisible
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              )}
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>

            <div className="absolute bottom-3 left-0 right-0 z-[2] flex items-center justify-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ir al banner ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/55 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          </>
        )}

        <span className="sr-only">
          Banner {index + 1} de {slides.length}: {current?.alt}. Usá las flechas o deslizá para ver más.
        </span>
      </div>
    </section>
  )
}
