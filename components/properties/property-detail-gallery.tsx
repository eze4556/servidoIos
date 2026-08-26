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

  const renderThumbs = (keyPrefix: string) =>
    items.map((item, i) => (
      <button
        key={`${keyPrefix}-${item.path || i}`}
        type="button"
        onClick={() => setActive(i)}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-white ring-2 transition-all",
          "h-16 w-16 lg:h-[4.5rem] lg:w-[4.5rem]",
          i === active ? "ring-servido-800 shadow-md" : "ring-servido-950/10 hover:ring-servido-800/40"
        )}
      >
        {item.type === "video" ? (
          <div className="flex h-full w-full items-center justify-center bg-servido-950">
            <Play className="h-5 w-5 text-servido-gold" />
          </div>
        ) : (
          <Image src={item.url} alt="" fill className="object-cover" sizes="72px" />
        )}
      </button>
    ))

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-servido-50 text-sm text-slate-500 ring-1 ring-servido-950/5 lg:rounded-[1.75rem]">
        Sin fotos ni videos
      </div>
    )
  }

  return (
    <div className="lg:flex lg:gap-4">
      {items.length > 1 && (
        <div className="hidden max-h-[min(70vh,560px)] w-[4.5rem] shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
          {renderThumbs("desk")}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-servido-50/40 shadow-[0_20px_50px_-28px_rgba(46,16,101,0.35)] ring-1 ring-servido-950/5 lg:rounded-[1.75rem]">
          {current?.type === "video" ? (
            <video
              key={current.url}
              src={current.url}
              controls
              playsInline
              className="h-full w-full bg-black object-contain"
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
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {renderThumbs("mob")}
          </div>
        )}
      </div>
    </div>
  )
}
