"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Mail,
  Shield,
  Scale,
  UtensilsCrossed,
  Users,
} from "lucide-react"
import { useTranslations } from "next-intl"

export function Footer() {
  const t = useTranslations("footer")
  const tc = useTranslations("common")
  const currentYear = new Date().getFullYear()

  const partnerLinks = [
    { href: "/signup/restaurante", label: t("partnerRestaurant") },
    { href: "/signup/cadete", label: t("partnerCadete") },
  ]

  const quickLinks = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("products") },
    { href: "/restaurantes", label: t("restaurants") },
    { href: "/historias", label: t("stories") },
    { href: "/services", label: t("services") },
    { href: "/favorites", label: t("favorites") },
    { href: "/mensajes", label: t("messages") },
  ]

  const legalLinks = [
    { href: "/terminos-y-condiciones", label: t("terms") },
    { href: "/politicas-de-privacidad", label: t("privacy") },
    { href: "/acerca-de-nosotros", label: t("about") },
    { href: "/trabaja-con-nosotros", label: t("careers") },
  ]

  return (
    <footer className="relative mt-auto shrink-0 overflow-hidden pb-16 lg:pb-0">
      <div className="absolute inset-0 bg-servido-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_100%,rgba(255,212,0,0.1),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_100%_0%,rgba(146,4,248,0.16),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container relative mx-auto max-w-screen-xl px-4 py-12 md:px-6 md:py-14 xl:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-5 lg:col-span-4">
            <Link href="/" className="group inline-block">
              <span className="servido-wordmark text-3xl font-bold tracking-tight">Servido</span>
              <p className="mt-1 text-xs font-medium text-white/55">{tc("marketplace")}</p>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">{tc("footerBlurb")}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-servido-gold" />
                {tc("protectedPurchase")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-servido-gold" />
                {tc("verifiedSellers")}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href="https://www.facebook.com/servido.arg?mibextid=wwXIfr&rdid=QLLNsnh76Cdb5erx&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BsQTJsDLf%3Fmibextid%3DwwXIfr#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Link>
              <Link
                href="https://www.instagram.com/servido.ok/?igsh=MWpkeDV4aGQwZ3A0Mw%3D%3D&utm_source=qr#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {t("partners")}
            </h4>
            <ul className="space-y-2.5">
              {partnerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/75 transition-colors hover:text-servido-gold"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {t("quickLinks")}
            </h4>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              {quickLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/75 transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {t("legal")}
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/75 transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/acerca-de-nosotros"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-servido-gold transition-colors hover:text-[#ffe566]"
            >
              <Users className="h-4 w-4" />
              {t("learnMore")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            <div className="mt-6 hidden border-t border-white/10 pt-5 lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {t("contact")}
              </p>
              <a
                href="mailto:servido.interno@gmail.com"
                className="mt-2 inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-servido-gold" />
                servido.interno@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Contacto mobile */}
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-servido-gold">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t("contact")}</p>
              <p className="text-xs text-white/55">{t("contactSubtitle")}</p>
            </div>
          </div>
          <a
            href="mailto:servido.interno@gmail.com"
            className="rounded-full bg-servido-gold px-4 py-2.5 text-center text-sm font-semibold text-servido-950"
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            servido.interno@gmail.com
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/45">{t("copyright", { year: currentYear })}</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-white/40">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            {t("restaurants")} · {t("services")} · {t("products")}
          </p>
        </div>
      </div>
    </footer>
  )
}
