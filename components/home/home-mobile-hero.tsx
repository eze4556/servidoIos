"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, MapPin, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CartDrawer } from "@/components/cart-drawer"
import { useLocation } from "@/contexts/location-context"
import { HomeServiceShortcuts } from "@/components/home/home-service-shortcuts"

function HomeMobileFixedHeader() {
  const router = useRouter()
  const { userLocation, loadingLocation } = useLocation()
  const [query, setQuery] = useState("")
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    const updateHeight = () => setHeaderHeight(el.offsetHeight)

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)

    return () => observer.disconnect()
  }, [userLocation, loadingLocation])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim()
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  const locationText = loadingLocation
    ? "Obteniendo ubicación..."
    : userLocation || "Seleccionar ubicación"

  return (
    <>
      <div
        ref={headerRef}
        className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700 px-4 pb-3 pt-3 shadow-lg shadow-servido-950/50 lg:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md ring-2 ring-white/30">
              <Image
                src="/images/logo-128.png"
                alt="Servido"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">Servido</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 active:scale-95"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <div className="[&_button]:text-white [&_button]:hover:bg-white/10">
              <CartDrawer />
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, servicios, comida..."
            className="h-11 rounded-2xl border-0 bg-white pl-11 pr-4 text-sm shadow-lg placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-servido-gold/50"
          />
        </form>

        <button
          type="button"
          className="mt-2.5 flex w-full items-start gap-1.5 text-left text-[11px] leading-snug text-purple-100"
          onClick={() => {}}
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-servido-gold" />
          <span className="min-w-0 flex-1 whitespace-normal break-words">Enviar a: {locationText}</span>
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </div>

      {/* Reserva el espacio del header fijo para que el contenido no quede debajo */}
      <div aria-hidden className="lg:hidden" style={{ height: headerHeight || undefined }} />
    </>
  )
}

export function HomeMobileHero() {
  return (
    <section className="lg:hidden">
      <HomeMobileFixedHeader />
      <HomeServiceShortcuts />
    </section>
  )
}
