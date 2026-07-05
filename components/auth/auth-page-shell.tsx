import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Shield, Store, Truck } from "lucide-react"

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

function AuthLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { wrap: "h-12 w-12", img: "h-10 w-10", px: 40, ring: "ring-[3px]" },
    md: { wrap: "h-16 w-16", img: "h-[3.25rem] w-[3.25rem]", px: 52, ring: "ring-4" },
    lg: { wrap: "h-[4.75rem] w-[4.75rem]", img: "h-[3.75rem] w-[3.75rem]", px: 60, ring: "ring-4" },
  }[size]

  return (
    <span
      className={`flex ${sizes.wrap} items-center justify-center rounded-full bg-white p-1 shadow-lg shadow-black/15 ${sizes.ring} ring-white/30`}
    >
      <Image
        src="/images/logo-192.png"
        alt="Servido"
        width={sizes.px}
        height={sizes.px}
        className={`${sizes.img} object-contain`}
        priority
      />
    </span>
  )
}

export function AuthPageShell({ title, subtitle, children, footer, wide }: AuthPageShellProps) {
  return (
    <div className="min-h-dvh min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/40">
      <div className="grid min-h-dvh min-h-screen lg:grid-cols-2">
        {/* Panel marca — desktop */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-servido-950 via-servido-700 to-servido-600" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,rgba(123,44,255,0.25),transparent_50%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-servido-600/20 blur-3xl" />

          <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-12 xl:px-16">
            <Link href="/" className="mb-10 inline-flex items-center gap-4">
              <AuthLogo size="lg" />
              <span className="text-2xl font-bold text-white">Servido</span>
            </Link>

            <h1 className="max-w-md text-3xl font-bold tracking-tight text-white xl:text-4xl">
              Estamos trabajando para ofrecerte la mejor experiencia.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-purple-100/90">
              Muy pronto podrás encontrar miles de productos, servicios y comercios.
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
        <div className="flex min-h-dvh min-h-screen flex-col lg:min-h-0 lg:justify-center">
          {/* Franja marca — mobile */}
          <div className="relative overflow-hidden px-4 py-6 sm:px-6 lg:hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-servido-950 via-servido-700 to-servido-600" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(123,44,255,0.2),transparent_60%)]" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Link>
                <Link href="/" className="shrink-0" aria-label="Servido">
                  <AuthLogo size="sm" />
                </Link>
              </div>
              <p className="text-sm leading-relaxed text-purple-50/95">
                Estamos trabajando para ofrecerte la mejor experiencia. Muy pronto podrás encontrar miles de
                productos, servicios y comercios.
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center px-4 pb-8 pt-2 sm:px-6 sm:pb-10 lg:px-10 lg:py-12 xl:px-16">
          <div
            className={`mx-auto w-full rounded-2xl bg-white p-5 shadow-xl shadow-purple-900/5 ring-1 ring-gray-100 sm:rounded-3xl sm:p-8 ${
              wide ? "max-w-xl" : "max-w-md"
            }`}
          >
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h2>
              <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>
            </div>

            {children}

            {footer && <div className="mt-5 border-t border-gray-100 pt-5 sm:mt-6 sm:pt-6">{footer}</div>}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const authInputClass =
  "h-11 rounded-xl border-0 bg-gray-50 text-base ring-1 ring-gray-200 transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-purple-300 sm:h-10 sm:text-sm"

export const authLabelClass = "text-xs font-semibold uppercase tracking-wider text-gray-500"
