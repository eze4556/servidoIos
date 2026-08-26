"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { ProductMedia } from "@/types/product"

interface VehicleDetailGalleryProps {
  media: ProductMedia[]
  alt: string
}

export function VehicleDetailGallery({ media, alt }: VehicleDetailGalleryProps) {
  const images = media.filter((m) => m.type === "image")
  const [active, setActive] = useState(0)
  const current = images[active]?.url || "/placeholder.svg?height=400&width=600"

  const renderThumbs = (keyPrefix: string) =>
    images.map((img, i) => (
      <button
        key={`${keyPrefix}-${img.path || i}`}
        type="button"
        onClick={() => setActive(i)}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-white ring-2 transition-all",
          "h-16 w-16 lg:h-[4.5rem] lg:w-[4.5rem]",
          i === active ? "ring-servido-800 shadow-md" : "ring-servido-950/10 hover:ring-servido-800/40"
        )}
      >
        <Image src={img.url} alt="" fill className="object-cover" sizes="72px" />
      </button>
    ))

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-servido-50 text-sm text-slate-500 ring-1 ring-servido-950/5 lg:rounded-[1.75rem]">
        Sin fotos
      </div>
    )
  }

  return (
    <div className="lg:flex lg:gap-4">
      {images.length > 1 && (
        <div className="hidden max-h-[min(70vh,560px)] w-[4.5rem] shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
          {renderThumbs("desk")}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-servido-50/40 shadow-[0_20px_50px_-28px_rgba(46,16,101,0.35)] ring-1 ring-servido-950/5 lg:rounded-[1.75rem]">
          <Image src={current} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 60vw" />
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {renderThumbs("mob")}
          </div>
        )}
      </div>
    </div>
  )
}
