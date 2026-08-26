"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface SearchChip {
  label: string
  href: string
}

interface HomeSearchHeroProps {
  chips?: SearchChip[]
}

export function HomeSearchHero({ chips }: HomeSearchHeroProps) {
  const th = useTranslations("home")
  const tHeader = useTranslations("header")
  const router = useRouter()
  const [query, setQuery] = useState("")

  const defaultChips: SearchChip[] = [
    { label: th("chipElectronics"), href: "/search?q=electronica" },
    { label: th("chipHome"), href: "/search?q=hogar" },
    { label: th("chipServices"), href: "/services" },
    { label: th("chipOffers"), href: "/products" },
  ]

  const displayChips = (chips ?? defaultChips).slice(0, 4)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim()
    if (term) {
      router.push(`/search?q=${encodeURIComponent(term)}`)
    }
  }

  return (
    <section className="home-desktop-hero relative isolate min-h-[min(72vh,640px)] overflow-hidden">
      {/* Full-bleed atmosphere */}
      <div className="home-animated-gradient absolute inset-0" />
      <div className="home-hero-mesh pointer-events-none absolute inset-0" />
      <div className="home-hero-orb home-hero-orb-a pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-servido-gold/15 blur-3xl" />
      <div className="home-hero-orb home-hero-orb-b pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[min(72vh,640px)] max-w-screen-xl flex-col justify-center px-6 py-16 xl:px-8">
        <div className="mx-auto w-full max-w-3xl text-center">
          <p className="home-hero-reveal home-hero-delay-1 font-serif text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
            Servido
            <span className="ml-1 text-servido-gold">.</span>
          </p>

          <h1 className="home-hero-reveal home-hero-delay-2 mt-5 text-2xl font-semibold tracking-tight text-white/95 sm:text-3xl md:text-4xl">
            {th("heroTitle")}
          </h1>
          <p className="home-hero-reveal home-hero-delay-3 mx-auto mt-3 max-w-xl text-base text-white/75 sm:text-lg">
            {th("heroSubtitle")}
          </p>

          <form
            onSubmit={handleSearch}
            className="home-hero-reveal home-hero-delay-4 mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch"
          >
            <div className="group relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-servido-800/50 transition-colors group-focus-within:text-servido-800" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tHeader("searchPlaceholder")}
                className="h-14 rounded-2xl border-0 bg-white/95 pl-12 pr-4 text-base text-servido-950 shadow-[0_12px_40px_-16px_rgba(46,16,101,0.55)] backdrop-blur placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-servido-gold/80"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-14 rounded-2xl bg-servido-gold px-8 text-base font-semibold text-servido-950 transition-transform duration-300 hover:scale-[1.02] hover:bg-[#ffe566] hover:text-servido-950"
            >
              {th("search")}
            </Button>
          </form>

          <nav
            aria-label={th("quickLinks")}
            className="home-hero-reveal home-hero-delay-5 mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          >
            {displayChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => router.push(chip.href)}
                className="group inline-flex items-center gap-1 text-sm font-medium text-white/70 transition-colors duration-300 hover:text-servido-gold"
              >
                {chip.label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  )
}
