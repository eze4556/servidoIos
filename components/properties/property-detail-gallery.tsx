"use client"

import { useState } from "react"
import Image from "next/image"
import { Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProductMedia } from "@/types/product"

interface PropertyDetailGalleryProps {
  media: ProductMedia[]
  alt: string
}

export function PropertyDetailGallery({ media, alt }: PropertyDetailGalleryProps) {
  const items = media.length > 0 ? media : []
  const [active, setActive] = useState(0)
  const current = items[active]

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-servido-900/80 text-sm text-purple-200/70 ring-1 ring-white/10">
        Sin fotos ni videos
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-servido-900 ring-1 ring-white/10">
        {current?.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="h-full w-full object-contain bg-black"
            aria-label={alt}
          />
        ) : (
          <Image
            src={current?.url || "/placeholder.svg?height=400&width=600"}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        )}
      </div>
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button
              key={item.path || i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition-all",
                i === active ? "ring-servido-700" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              {item.type === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-servido-900">
                  <Play className="h-6 w-6 text-white" />
                </div>
              ) : (
                <Image src={item.url} alt="" fill className="object-cover" sizes="96px" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
