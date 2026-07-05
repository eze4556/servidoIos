"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  MapPin,
  Pill,
  Search,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { CartDrawer } from "@/components/cart-drawer"
import { useLocation } from "@/contexts/location-context"

const serviceShortcuts = [
  {
    id: "productos",
    label: "Productos",
    icon: ShoppingBag,
    href: "/products",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    id: "restaurantes",
    label: "Restaurantes",
    icon: UtensilsCrossed,
    href: "/proximamente?seccion=restaurantes",
    iconBg: "bg-orange-50 text-orange-500",
  },
  {
    id: "mercados",
    label: "Mercados",
    icon: Store,
    href: "/proximamente?seccion=mercados",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "farmacias",
    label: "Farmacias",
    icon: Pill,
    href: "/proximamente?seccion=farmacias",
    iconBg: "bg-sky-50 text-blue-500",
  },
  {
    id: "mas",
    label: "Más",
    icon: LayoutGrid,
    href: "/proximamente?seccion=mas",
    iconBg: "bg-purple-50 text-purple-600",
  },
]

export function HomeMobileHero() {
  const router = useRouter()
  const { userLocation, loadingLocation } = useLocation()
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim()
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <section className="lg:hidden">
      {/* Header morado integrado */}
      <div className="bg-gradient-to-br from-servido-950 via-servido-700 to-servido-600 px-4 pb-10 pt-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white">Servido</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-purple-200">
              Marketplace
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <div className="[&_button]:text-white [&_button]:hover:bg-white/10">
              <CartDrawer />
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, servicios, comida..."
            className="h-11 rounded-2xl border-0 bg-white/95 pl-11 pr-4 text-sm shadow-lg placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-servido-gold/50"
          />
        </form>

        <button
          type="button"
          className="mt-3 flex w-full items-start gap-1.5 text-left text-[11px] leading-snug text-purple-100"
          onClick={() => {}}
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-servido-gold" />
          <span className="min-w-0 flex-1 whitespace-normal break-words">
            Enviar a: {loadingLocation ? "Obteniendo ubicación..." : userLocation || "Seleccionar ubicación"}
          </span>
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </div>

      {/* Atajos de servicios — card blanca */}
      <div className="-mt-6 px-4 pb-1">
        <div className="rounded-3xl bg-white px-4 py-5 shadow-md shadow-black/[0.08] ring-1 ring-black/[0.04]">
          <div className="grid grid-cols-5 gap-x-1.5">
            {serviceShortcuts.map(({ id, label, icon: Icon, href, iconBg }) => (
              <Link
                key={id}
                href={href}
                className="flex flex-col items-center gap-2 rounded-2xl py-0.5 text-center transition-colors active:bg-gray-50"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full xs:h-[3.25rem] xs:w-[3.25rem] ${iconBg}`}
                >
                  <Icon className="h-5 w-5 stroke-[1.75] xs:h-[1.35rem] xs:w-[1.35rem]" />
                </span>
                <span className="block min-h-[2.4em] w-full px-0.5 text-[10px] font-medium leading-[1.25] text-gray-800 xs:text-[11px] [overflow-wrap:anywhere]">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
