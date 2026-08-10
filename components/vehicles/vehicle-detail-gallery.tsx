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

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-servido-900/80 text-sm text-purple-200/70 ring-1 ring-white/10">
        Sin fotos
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-servido-900 ring-1 ring-white/10">
        <Image src={current} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 60vw" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.path || i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition-all",
                i === active ? "ring-servido-700" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
