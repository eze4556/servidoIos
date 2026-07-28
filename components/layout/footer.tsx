"use client"

import Link from "next/link"
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
  UtensilsCrossed,
} from "lucide-react"
import { useTranslations } from "next-intl"

export function Footer() {
  const t = useTranslations("footer")
  const tc = useTranslations("common")
  const currentYear = new Date().getFullYear()

  const partnerLinks = [
    { href: "/signup/restaurante", label: t("partnerRestaurant"), icon: UtensilsCrossed },
    { href: "/signup/cadete", label: t("partnerCadete"), icon: Users },
  ]

  const quickLinks = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/products", label: t("products"), icon: Package },
    { href: "/restaurantes", label: t("restaurants"), icon: UtensilsCrossed },
    { href: "/historias", label: t("stories"), icon: Sparkles },
    { href: "/mensajes", label: t("messages"), icon: Mail },
    { href: "/services", label: t("services"), icon: Sparkles },
    { href: "/favorites", label: t("favorites"), icon: Heart },
  ]

  const legalLinks = [
    { href: "/terminos-y-condiciones", label: t("terms") },
    { href: "/politicas-de-privacidad", label: t("privacy") },
    { href: "/acerca-de-nosotros", label: t("about") },
    { href: "/trabaja-con-nosotros", label: t("careers") },
  ]

  return (
    <footer className="relative mt-auto shrink-0 overflow-hidden pb-16 lg:pb-0">
      <div className="absolute inset-0 bg-gradient-to-b from-servido-950 via-servido-900 to-servido-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_100%,rgba(168,85,247,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(76,29,149,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container relative mx-auto px-4 py-12 md:px-6 md:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-5 lg:col-span-4">
            <Link href="/" className="group inline-flex flex-col">
              <h3 className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-purple-100">
                {tc("brand")}
              </h3>
              <p className="text-xs font-medium text-purple-200">{tc("marketplace")}</p>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-purple-100/90">{tc("footerBlurb")}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-purple-100 ring-1 ring-white/10">
                <Shield className="h-3.5 w-3.5" />
                {tc("protectedPurchase")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-purple-100 ring-1 ring-white/10">
                <Scale className="h-3.5 w-3.5" />
                {tc("verifiedSellers")}
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

          <div className="lg:col-span-2">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-servido-gold" />
              {t("partners")}
            </h4>
            <ul className="space-y-1">
              {partnerLinks.map(({ href, label, icon: Icon }) => (
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

          <div className="lg:col-span-3">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              {t("quickLinks")}
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

          <div className="sm:col-span-2 lg:col-span-3">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  {t("legal")}
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
              <div>
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  {t("company")}
                </h4>
                <Link
                  href="/acerca-de-nosotros"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-purple-100/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  {t("learnMore")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-purple-100">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{t("contact")}</p>
                <p className="text-xs text-purple-200">{t("contactSubtitle")}</p>
              </div>
            </div>
            <a
              href="mailto:servido.interno@gmail.com"
              className="flex w-full min-w-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/15 sm:text-base"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              servido.interno@gmail.com
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-purple-300/80">
          {t("copyright", { year: currentYear })}
        </p>
      </div>
    </footer>
  )
}
