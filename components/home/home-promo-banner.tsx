import Link from "next/link"
import Image from "next/image"

interface HomePromoBannerProps {
  className?: string
}

export function HomePromoBanner({ className }: HomePromoBannerProps) {
  return (
    <section className={className}>
      <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-servido-700/20">
        <div className="relative aspect-[2.2/1] min-h-[140px] w-full sm:aspect-[2.8/1]">
          <Image
            src="/banner.jfif"
            alt="Promoción Servido"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 800px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-servido-950/90 via-servido-800/85 to-servido-900/80" />
          <div className="absolute inset-0 flex flex-col justify-center px-5 py-4 sm:px-8">
            <p className="max-w-[85%] text-base font-bold leading-snug text-white sm:text-xl">
              Estamos trabajando para ofrecerte la mejor experiencia.
            </p>
            <p className="mt-2 max-w-[90%] text-xs leading-relaxed text-purple-100 sm:text-sm">
              Muy pronto podrás encontrar miles de productos, servicios y comercios.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex w-fit rounded-full bg-servido-gold px-5 py-2 text-sm font-bold text-servido-950 shadow-md transition-transform hover:scale-[1.02]"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
