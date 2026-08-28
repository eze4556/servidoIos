import Link from "next/link"
import { SimpleImage } from "@/components/ui/simple-image"
import { ArrowUpRight } from "lucide-react"
import { categoryHref } from "@/lib/routes"

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
        href={categoryHref(id)}
        className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_16px_36px_-20px_rgba(46,16,101,0.35)] ring-1 ring-servido-950/10 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_22px_44px_-18px_rgba(46,16,101,0.4)] hover:ring-servido-800/25 lg:rounded-[1.5rem]"
      >
        <SimpleImage
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-servido-950/90 via-servido-900/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 lg:p-5">
          <span className="text-sm font-bold text-white sm:text-base lg:text-lg">{name}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all duration-300 group-hover:bg-servido-gold group-hover:text-servido-950">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={categoryHref(id)}
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
