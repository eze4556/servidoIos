"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchChip {
  label: string
  href: string
}

interface HomeSearchHeroProps {
  chips?: SearchChip[]
}

const defaultChips: SearchChip[] = [
  { label: "Electrónica", href: "/search?q=electronica" },
  { label: "Hogar", href: "/search?q=hogar" },
  { label: "Servicios", href: "/services" },
  { label: "Ofertas", href: "/products" },
]

export function HomeSearchHero({ chips = defaultChips }: HomeSearchHeroProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim()
    if (term) {
      router.push(`/search?q=${encodeURIComponent(term)}`)
    }
  }

  return (
    <section className="home-section relative overflow-hidden px-4 pb-8 pt-6 md:px-6">
      <div className="container mx-auto max-w-screen-xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-purple-800 to-violet-900 px-6 py-10 shadow-2xl shadow-purple-900/25 sm:px-10 sm:py-14 md:py-16">
          <div className="home-hero-glow pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-violet-300/15 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-100 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Servido Marketplace
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              ¿Qué estás buscando hoy?
            </h1>
            <p className="mt-3 text-sm text-purple-100 sm:text-base md:text-lg">
              Productos, servicios y ofertas de vendedores de confianza
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos, marcas, servicios..."
                  className="h-12 rounded-2xl border-0 bg-white pl-12 pr-4 text-base shadow-lg placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-purple-300 sm:h-14"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-2xl bg-white px-8 font-semibold text-purple-900 shadow-lg transition-all hover:bg-purple-50 hover:shadow-xl sm:h-14"
              >
                Buscar
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => router.push(chip.href)}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/20 hover:scale-105"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
