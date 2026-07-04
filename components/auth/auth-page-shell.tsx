import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Shield, Sparkles, Store, Truck } from "lucide-react"

interface AuthPageShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

const highlights = [
  { icon: Shield, text: "Compra protegida" },
  { icon: Truck, text: "Envíos seguros" },
  { icon: Store, text: "Vendedores verificados" },
]

export function AuthPageShell({ title, subtitle, children, footer, wide }: AuthPageShellProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 via-white to-purple-50/40 lg:min-h-screen">
      <div className="grid min-h-[inherit] lg:grid-cols-2">
        {/* Panel marca — desktop */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d0057] via-purple-900 to-violet-950" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,rgba(168,85,247,0.25),transparent_50%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-12 xl:px-16">
            <Link href="/" className="mb-10 inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <Image
                  src="/images/logo.png"
                  alt="Servido"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              </span>
              <span className="text-2xl font-bold text-white">Servido</span>
            </Link>

            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-100">
              <Sparkles className="h-3.5 w-3.5" />
              Marketplace
            </span>
            <h1 className="max-w-md text-3xl font-bold tracking-tight text-white xl:text-4xl">
              Comprá, vendé y encontrá servicios en un solo lugar
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-purple-100/90">
              Miles de productos y servicios de vendedores de confianza. Unite a la comunidad Servido.
            </p>

            <ul className="mt-8 space-y-3">
              {highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-purple-100">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 px-10 py-6 text-xs text-purple-300/80 xl:px-16">
            © {new Date().getFullYear()} Servido · Todos los derechos reservados
          </p>
        </div>

        {/* Formulario */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-12 xl:px-16">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <Link href="/">
              <Image src="/images/logo.png" alt="Servido" width={100} height={40} className="h-8 w-auto" />
            </Link>
          </div>

          <div
            className={`mx-auto w-full rounded-3xl bg-white p-6 shadow-xl shadow-purple-900/5 ring-1 ring-gray-100 sm:p-8 ${
              wide ? "max-w-xl" : "max-w-md"
            }`}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
              <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>
            </div>

            {children}

            {footer && <div className="mt-6 border-t border-gray-100 pt-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export const authInputClass =
  "rounded-xl border-0 bg-gray-50 py-2.5 ring-1 ring-gray-200 transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-purple-300"

export const authLabelClass = "text-xs font-semibold uppercase tracking-wider text-gray-500"
