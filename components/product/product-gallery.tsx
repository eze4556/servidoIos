"use client"

import { SimpleImage } from "@/components/ui/simple-image"
import { Button } from "@/components/ui/button"
import { Heart, Play, Video } from "lucide-react"
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
            <SimpleImage
              src={current?.url || "/placeholder.svg"}
              alt={productName}
              className="h-full w-full object-contain p-3 transition-transform duration-500 lg:p-5"
              key={`main-${selectedIndex}`}
            />
          )}

          <Button
            variant="secondary"
            size="icon"
            className="absolute right-3 top-3 h-10 w-10 rounded-full border-0 bg-white/90 shadow-md backdrop-blur-sm hover:bg-white lg:right-4 lg:top-4 lg:h-11 lg:w-11"
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
    </div>
  )
}
