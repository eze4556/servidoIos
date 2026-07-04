import Link from "next/link"
import { SimpleImage } from "@/components/ui/simple-image"
import { ArrowUpRight } from "lucide-react"

interface HomeCategoryCardProps {
  id: string
  name: string
  imageUrl?: string
  iconQuery?: string
  variant?: "compact" | "tile"
}

export function HomeCategoryCard({
  id,
  name,
  imageUrl,
  iconQuery,
  variant = "compact",
}: HomeCategoryCardProps) {
  const src = imageUrl || `/placeholder.svg?height=200&width=200&query=${iconQuery || name + " icon"}`

  if (variant === "tile") {
    return (
      <Link
        href={`/category/${id}`}
        className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-purple-300"
      >
        <SimpleImage
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/85 via-purple-900/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
          <span className="text-sm font-bold text-white sm:text-base">{name}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all group-hover:bg-white group-hover:text-purple-900">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/category/${id}`}
      className="group flex flex-col items-center transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:ring-purple-200 sm:h-24 sm:w-24">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-600/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <SimpleImage
          src={src}
          alt={name}
          className="relative z-10 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <span className="max-w-[100px] text-center text-xs font-semibold leading-tight text-gray-700 transition-colors group-hover:text-purple-700 sm:text-sm">
        {name}
      </span>
    </Link>
  )
}
