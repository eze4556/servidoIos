"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SimpleImage } from "@/components/ui/simple-image"
import { Button } from "@/components/ui/button"
import { Heart, Play, Video, ZoomIn, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProductMediaItem {
  type: "image" | "video"
  url: string
  path: string
  thumbnail?: string
}

interface ProductGalleryProps {
  media: ProductMediaItem[]
  productName: string
  selectedIndex: number
  onSelectIndex: (index: number) => void
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function ProductGallery({
  media,
  productName,
  selectedIndex,
  onSelectIndex,
  isFavorite,
  onToggleFavorite,
}: ProductGalleryProps) {
  const current = media[selectedIndex]
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null)
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const lastTapRef = useRef(0)

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [lightboxOpen, closeLightbox])

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [selectedIndex])

  const openLightbox = () => {
    if (current?.type !== "image") return
    setLightboxOpen(true)
  }

  const handleDoubleTapZoom = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (scale > 1) {
        setScale(1)
        setOffset({ x: 0, y: 0 })
      } else {
        setScale(2.5)
      }
    }
    lastTapRef.current = now
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { dist: Math.hypot(dx, dy), scale }
      panRef.current = null
    } else if (e.touches.length === 1 && scale > 1) {
      panRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        ox: offset.x,
        oy: offset.y,
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const next = Math.min(4, Math.max(1, pinchRef.current.scale * (dist / pinchRef.current.dist)))
      setScale(next)
      if (next === 1) setOffset({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && panRef.current && scale > 1) {
      setOffset({
        x: panRef.current.ox + (e.touches[0].clientX - panRef.current.x),
        y: panRef.current.oy + (e.touches[0].clientY - panRef.current.y),
      })
    }
  }

  const onTouchEnd = () => {
    pinchRef.current = null
    panRef.current = null
    if (scale < 1.05) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setScale((s) => {
      const next = Math.min(4, Math.max(1, s + delta))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }

  const renderThumbs = (keyPrefix: string) =>
    media.map((item, index) => (
      <button
        key={`${keyPrefix}-${index}`}
        type="button"
        onClick={() => onSelectIndex(index)}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-white ring-2 transition-all",
          "h-16 w-16 lg:h-[4.5rem] lg:w-[4.5rem]",
          selectedIndex === index
            ? "ring-servido-800 shadow-md"
            : "ring-servido-950/10 hover:ring-servido-800/40"
        )}
      >
        {item.type === "video" ? (
          <div className="relative flex h-full w-full items-center justify-center bg-slate-100">
            {item.thumbnail ? (
              <SimpleImage src={item.thumbnail} alt={`Video ${index + 1}`} className="h-full w-full object-cover" />
            ) : (
              <Video className="h-5 w-5 text-slate-500" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <Play className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          <SimpleImage
            src={item.url || "/placeholder.svg"}
            alt={`${productName} ${index + 1}`}
            className="h-full w-full object-cover"
          />
        )}
      </button>
    ))

  return (
    <div className="lg:flex lg:gap-4">
      {media.length > 1 && (
        <div className="hidden max-h-[min(70vh,560px)] w-[4.5rem] shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
          {renderThumbs("desk")}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-servido-50/40 shadow-[0_20px_50px_-28px_rgba(46,16,101,0.35)] ring-1 ring-servido-950/5 lg:rounded-[1.75rem]">
          {current?.type === "video" ? (
            <video controls className="h-full w-full object-contain" poster={current.thumbnail}>
              <source src={current.url} type="video/mp4" />
              Tu navegador no soporta videos.
            </video>
          ) : (
            <button
              type="button"
              onClick={openLightbox}
              className="group relative h-full w-full cursor-zoom-in"
              aria-label="Ver imagen ampliada"
            >
              <SimpleImage
                src={current?.url || "/placeholder.svg"}
                alt={productName}
                className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.02] lg:p-5"
                key={`main-${selectedIndex}`}
              />
              <span className="pointer-events-none absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm lg:bottom-4 lg:left-4">
                <ZoomIn className="h-4 w-4" />
              </span>
            </button>
          )}

          <Button
            variant="secondary"
            size="icon"
            className="absolute right-3 top-3 z-10 h-10 w-10 rounded-full border-0 bg-white/90 shadow-md backdrop-blur-sm hover:bg-white lg:right-4 lg:top-4 lg:h-11 lg:w-11"
            onClick={onToggleFavorite}
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
          </Button>
        </div>

        {media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {renderThumbs("mob")}
          </div>
        )}
      </div>

      {lightboxOpen && current?.type === "image" && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
            onClick={closeLightbox}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative flex h-full w-full touch-none items-center justify-center overflow-hidden p-4"
            onClick={(e) => {
              e.stopPropagation()
              handleDoubleTapZoom()
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={onWheel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url || "/placeholder.svg"}
              alt={productName}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-100 will-change-transform"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
              draggable={false}
            />
          </div>

          {media.length > 1 && (
            <div
              className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {media.map((item, index) =>
                item.type === "image" ? (
                  <button
                    key={`lb-${index}`}
                    type="button"
                    onClick={() => onSelectIndex(index)}
                    className={cn(
                      "h-2 w-2 rounded-full transition",
                      selectedIndex === index ? "bg-white" : "bg-white/40"
                    )}
                    aria-label={`Imagen ${index + 1}`}
                  />
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
