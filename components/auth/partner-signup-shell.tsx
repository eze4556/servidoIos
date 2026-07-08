"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type PartnerSignupVariant = "restaurant" | "cadete"

interface PartnerHighlight {
  icon: LucideIcon
  text: string
}

interface PartnerSignupShellProps {
  variant: PartnerSignupVariant
  heroTitle: string
  heroSubtitle: string
  highlights: PartnerHighlight[]
  formTitle: string
  formSubtitle: string
  children: ReactNode
  footer?: ReactNode
  icon: LucideIcon
}

const variantStyles: Record<
  PartnerSignupVariant,
  {
    accent: string
    iconBg: string
    ring: string
    badge: string
    gradient: string
  }
> = {
  restaurant: {
    accent: "text-servido-gold",
    iconBg: "bg-servido-gold/20 ring-servido-gold/40",
    ring: "ring-servido-gold/30",
    badge: "bg-servido-gold/15 text-servido-gold",
    gradient: "from-servido-950 via-servido-800 to-servido-700",
  },
  cadete: {
    accent: "text-sky-300",
    iconBg: "bg-sky-400/20 ring-sky-400/40",
    ring: "ring-sky-400/30",
    badge: "bg-sky-400/15 text-sky-200",
    gradient: "from-servido-950 via-servido-900 to-sky-950",
  },
}

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

export function PartnerSignupShell({
  variant,
  heroTitle,
  heroSubtitle,
  highlights,
  formTitle,
  formSubtitle,
  children,
  footer,
  icon: Icon,
}: PartnerSignupShellProps) {
  const styles = variantStyles[variant]
  const [phase, setPhase] = useState<"intro" | "hero" | "form">("intro")
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const prefersReduced = mq.matches
    setReducedMotion(prefersReduced)

    if (prefersReduced) {
      setPhase("form")
      return
    }

    const t1 = window.setTimeout(() => setPhase("hero"), 800)
    const t2 = window.setTimeout(() => setPhase("form"), 1200)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  const showIntro = phase === "intro" && !reducedMotion
  const showHero = phase === "hero" && !reducedMotion
  const showForm = phase === "form" || reducedMotion

  return (
    <div className="min-h-dvh min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/40">
      <div className="grid min-h-dvh min-h-screen lg:grid-cols-2">
        {/* Panel marca — desktop */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <div className={cn("absolute inset-0 bg-gradient-to-br", styles.gradient)} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,rgba(255,212,0,0.12),transparent_50%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-12 xl:px-16">
            <Link href="/" className="mb-10 inline-flex items-center gap-4">
              <AuthLogo size="lg" />
              <span className="text-2xl font-bold text-white">Servido</span>
            </Link>

            <span
              className={cn(
                "mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                styles.badge
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {variant === "restaurant" ? "Soy restaurante" : "Soy cadete"}
            </span>

            <h1 className="max-w-md text-3xl font-bold tracking-tight text-white xl:text-4xl">{heroTitle}</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-purple-100/90">{heroSubtitle}</p>

            <ul className="mt-8 space-y-3">
              {highlights.map(({ icon: HighlightIcon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-purple-100">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
                      styles.iconBg
                    )}
                  >
                    <HighlightIcon className={cn("h-4 w-4", styles.accent)} />
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
        <div className="relative flex min-h-dvh min-h-screen flex-col lg:min-h-0 lg:justify-center">
          {/* Animación de entrada — overlay mobile + desktop */}
          {showIntro && (
            <div
              className={cn(
                "absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br px-6 text-center animate-in fade-in duration-500",
                styles.gradient
              )}
            >
              <span
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-3xl ring-2 animate-in zoom-in-95 duration-700",
                  styles.iconBg,
                  styles.ring
                )}
              >
                <Icon className={cn("h-10 w-10", styles.accent)} />
              </span>
            </div>
          )}

          {showHero && (
            <div
              className={cn(
                "absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500",
                styles.gradient
              )}
            >
              <span
                className={cn(
                  "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-2",
                  styles.iconBg,
                  styles.ring
                )}
              >
                <Icon className={cn("h-8 w-8", styles.accent)} />
              </span>
              <h2 className="max-w-sm text-2xl font-bold text-white">{heroTitle}</h2>
              <p className="mt-3 max-w-xs text-sm text-purple-100/90">{heroSubtitle}</p>
            </div>
          )}

          {/* Franja marca — mobile */}
          <div className="relative overflow-hidden px-4 py-6 sm:px-6 lg:hidden">
            <div className={cn("absolute inset-0 bg-gradient-to-br", styles.gradient)} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(255,212,0,0.1),transparent_60%)]" />
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
              <p className="text-sm leading-relaxed text-purple-50/95">{heroSubtitle}</p>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col justify-center px-4 pb-8 pt-2 sm:px-6 sm:pb-10 lg:px-10 lg:py-12 xl:px-16",
              showForm && "animate-in fade-in slide-in-from-bottom-4 duration-500"
            )}
          >
            <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl shadow-purple-900/5 ring-1 ring-gray-100 sm:rounded-3xl sm:p-8">
              <div className="mb-5 sm:mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{formTitle}</h2>
                <p className="mt-1.5 text-sm text-gray-500">{formSubtitle}</p>
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

export { authInputClass, authLabelClass } from "@/components/auth/auth-page-shell"
