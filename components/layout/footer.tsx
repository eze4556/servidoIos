"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowUpRight,
  Facebook,
  FileText,
  Heart,
  Home,
  Instagram,
  Mail,
  Package,
  Scale,
  Shield,
  Sparkles,
  Users,
} from "lucide-react"

const quickLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/services", label: "Servicios", icon: Sparkles },
  { href: "/favorites", label: "Favoritos", icon: Heart },
]

const legalLinks = [
  { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
  { href: "/politicas-de-privacidad", label: "Políticas de privacidad" },
  { href: "/acerca-de-nosotros", label: "Quiénes somos" },
  { href: "/trabaja-con-nosotros", label: "Trabajá con nosotros" },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-auto shrink-0 overflow-hidden pb-16 lg:pb-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d0057] via-purple-900 to-violet-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_100%,rgba(168,85,247,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(139,92,246,0.14),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container relative mx-auto px-4 py-12 md:px-6 md:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="space-y-5 lg:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm transition-colors group-hover:bg-white/15">
                <Image
                  src="/images/logo.png"
                  alt="Servido Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </span>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">Servido</h3>
                <p className="text-xs font-medium text-purple-200">Marketplace</p>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-purple-100/90">
              Tu marketplace confiable para comprar y vender productos y servicios. Conectamos compradores
              con vendedores de confianza.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-purple-100 ring-1 ring-white/10">
                <Shield className="h-3.5 w-3.5" />
                Compra protegida
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-purple-100 ring-1 ring-white/10">
                <Scale className="h-3.5 w-3.5" />
                Vendedores verificados
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href="https://www.facebook.com/servido.arg?mibextid=wwXIfr&rdid=QLLNsnh76Cdb5erx&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BsQTJsDLf%3Fmibextid%3DwwXIfr#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-purple-100 ring-1 ring-white/10 transition-all hover:bg-white/20 hover:text-white"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Link>
              <Link
                href="https://www.instagram.com/servido.ok/?igsh=MWpkeDV4aGQwZ3A0Mw%3D%3D&utm_source=qr#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-purple-100 ring-1 ring-white/10 transition-all hover:bg-white/20 hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-3">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Enlaces rápidos
            </h4>
            <ul className="space-y-1">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-purple-100/90 transition-all hover:bg-white/10 hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-purple-200 transition-colors group-hover:bg-white/10 group-hover:text-white">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Legal
            </h4>
            <ul className="space-y-1">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-purple-100/90 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Contacto
            </h4>
            <a
              href="mailto:servidoarg@gmail.com"
              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-purple-100">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-purple-300">Email</p>
                <p className="break-all text-sm font-medium text-white group-hover:underline">
                  servidoarg@gmail.com
                </p>
              </div>
            </a>
            <Link
              href="/acerca-de-nosotros"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-purple-200 transition-colors hover:text-white"
            >
              <Users className="h-4 w-4" />
              Conocé más sobre Servido
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm text-purple-200/80 md:text-left">
              © {currentYear} Servido. Todos los derechos reservados.
            </p>
            <p className="flex items-center gap-1.5 text-sm text-purple-200/80">
              Desarrollado por
              <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white ring-1 ring-white/10">
                Atenea Software
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
