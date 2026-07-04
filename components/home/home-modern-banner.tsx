import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { SimpleImage } from "@/components/ui/simple-image"

export interface ModernBannerData {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  subtitle?: string
  description?: string
  ctaText?: string
}

interface HomeModernBannerProps {
  banner: ModernBannerData
  variant?: "hero" | "promo"
  badge?: string
}

export function HomeModernBanner({ banner, variant = "hero", badge }: HomeModernBannerProps) {
  const subtitle = banner.subtitle || banner.description
  const ctaText = banner.ctaText || "Ver más"
  const href = banner.linkUrl || "/products"
  const isHero = variant === "hero"

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5 ${
        isHero ? "aspect-[16/9] sm:aspect-[16/7] md:aspect-[16/5]" : "aspect-[16/9] sm:aspect-[16/6] md:aspect-[16/5]"
      }`}
    >
      <SimpleImage
        src={banner.imageUrl}
        alt={banner.title}
        priority={isHero}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-purple-950/90 via-purple-900/70 to-purple-800/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-violet-300/15 blur-2xl" />

      <div className="relative flex h-full flex-col justify-center px-6 py-8 sm:px-10 md:px-14 md:py-10">
        {badge && (
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </span>
        )}

        <h2
          className={`max-w-xl font-bold leading-tight tracking-tight text-white ${
            isHero ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl" : "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
          }`}
        >
          {banner.title}
        </h2>

        {subtitle && (
          <p className="mt-3 max-w-md text-sm text-purple-100 sm:text-base md:mt-4 md:text-lg">
            {subtitle}
          </p>
        )}

        <Link
          href={href}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-purple-900 shadow-lg transition-all duration-300 hover:gap-3 hover:bg-purple-50 hover:shadow-xl md:mt-6 md:px-6 md:py-3 md:text-base"
        >
          {ctaText}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
