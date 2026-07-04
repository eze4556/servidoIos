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

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-purple-50/40 shadow-lg ring-1 ring-gray-100">
        {current?.type === "video" ? (
          <video controls className="h-full w-full object-contain" poster={current.thumbnail}>
            <source src={current.url} type="video/mp4" />
            Tu navegador no soporta videos.
          </video>
        ) : (
          <SimpleImage
            src={current?.url || "/placeholder.svg"}
            alt={productName}
            className="h-full w-full object-contain p-4 transition-transform duration-500"
            key={`main-${selectedIndex}`}
          />
        )}

        <Button
          variant="secondary"
          size="icon"
          className="absolute right-4 top-4 h-11 w-11 rounded-full border-0 bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
          onClick={onToggleFavorite}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
        </Button>
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelectIndex(index)}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white ring-2 transition-all",
                selectedIndex === index
                  ? "ring-purple-600 shadow-md shadow-purple-200"
                  : "ring-gray-200 hover:ring-purple-300"
              )}
            >
              {item.type === "video" ? (
                <div className="relative flex h-full w-full items-center justify-center bg-gray-100">
                  {item.thumbnail ? (
                    <SimpleImage src={item.thumbnail} alt={`Video ${index + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <Video className="h-6 w-6 text-gray-500" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="h-5 w-5 text-white" />
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
          ))}
        </div>
      )}
    </div>
  )
}
