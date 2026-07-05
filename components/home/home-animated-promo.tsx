"use client"

import Link from "next/link"
import { ArrowRight, Store, Wrench, Shield } from "lucide-react"

export function HomeAnimatedPromo() {
  return (
    <section className="home-section home-section-delay-2 px-4 py-6 md:px-6">
      <div className="container mx-auto max-w-screen-xl">
        <div className="home-animated-promo relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-purple-200/50">
          <div className="home-animated-gradient absolute inset-0" />
          <div className="home-particles absolute inset-0" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="home-particle"
                style={{
                  left: `${(i * 17 + 5) % 95}%`,
                  top: `${(i * 23 + 10) % 85}%`,
                  animationDelay: `${(i % 6) * 0.7}s`,
                  animationDuration: `${4 + (i % 5)}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center px-6 py-14 text-center sm:py-16 md:py-20">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-200">
              Próximamente en Servido
            </p>
            <h2 className="max-w-xl text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Estamos trabajando para ofrecerte la mejor experiencia.
            </h2>
            <p className="mt-4 max-w-lg text-sm text-purple-100 sm:text-base">
              Muy pronto podrás encontrar miles de productos, servicios y comercios.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-purple-100">
              <span className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                Compra segura
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Store className="h-4 w-4" />
                Vendedores verificados
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4" />
                Servicios locales
              </span>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-purple-900 shadow-lg transition-all hover:gap-3 hover:shadow-xl"
              >
                Explorar productos
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=seller"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Empezá a vender
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
