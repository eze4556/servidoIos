import Image from "next/image"

interface HomePromoBannerProps {
  className?: string
}

export function HomePromoBanner({ className }: HomePromoBannerProps) {
  return (
    <section className={className}>
      <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
        <Image
          src="/images/bannernuevooficial2.jpeg"
          alt="Equipá tu hogar con lo mejor"
          width={1600}
          height={726}
          className="h-auto w-full"
          priority
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
    </section>
  )
}
