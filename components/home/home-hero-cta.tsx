import Link from "next/link"
import { Package, Wrench, Sparkles } from "lucide-react"

export function HomeHeroCta() {
  return (
    <section className="home-fade-in -mt-2 px-4 pb-6 md:px-6">
      <div className="container mx-auto">
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/products"
            className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-purple-200"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg shadow-purple-200 transition-transform duration-300 group-hover:scale-105">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-gray-900">Productos</p>
              <p className="text-xs text-gray-500">Explorá el catálogo</p>
            </div>
          </Link>
          <Link
            href="/services"
            className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-purple-200"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-purple-200 transition-transform duration-300 group-hover:scale-105">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-gray-900">Servicios</p>
              <p className="text-xs text-gray-500">Profesionales cerca</p>
            </div>
          </Link>
          <Link
            href="/products"
            className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 p-4 text-white shadow-lg shadow-purple-300/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:col-span-1"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Ofertas del día</p>
              <p className="text-xs text-purple-100">Descubrí las novedades</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
