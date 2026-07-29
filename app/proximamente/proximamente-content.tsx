"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, Clock, Sparkles, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"

const sectionKeys = ["restaurantes", "mercados", "farmacias", "envios", "mas"] as const

export default function ProximamenteContent() {
  const t = useTranslations("proximamente")
  const searchParams = useSearchParams()
  const seccion = searchParams.get("seccion")?.toLowerCase()
  const sectionKey = seccion && sectionKeys.includes(seccion as (typeof sectionKeys)[number]) ? seccion : null
  const sectionLabel = sectionKey ? t(`sections.${sectionKey}` as "sections.restaurantes") : seccion
  const isRestaurantes = seccion === "restaurantes"

  return (
    <div className="flex min-h-[70vh] flex-col bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-servido-gold/20 text-servido-950">
          {isRestaurantes ? <UtensilsCrossed className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </span>
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-servido-700/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-servido-700">
          <Sparkles className="h-3.5 w-3.5" />
          {isRestaurantes ? t("badgeRestaurants") : t("badgeSoon")}
        </span>
        <h1 className="max-w-md text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {isRestaurantes
            ? t("titleRestaurants")
            : sectionLabel
              ? t("titleSection", { section: sectionLabel })
              : t("titleGeneric")}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-gray-600">
          {isRestaurantes ? t("bodyRestaurants") : t("bodyDefault")}
        </p>
        {!isRestaurantes && (
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-500">{t("bodyExtra")}</p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isRestaurantes ? (
            <>
              <Button asChild className="rounded-full bg-servido-700 hover:bg-servido-800">
                <Link href="/restaurantes">{t("viewRestaurants")}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-servido-200 text-servido-800">
                <Link href="/signup/restaurante">{t("iAmRestaurant")}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="rounded-full bg-servido-700 hover:bg-servido-800">
                <Link href="/products">{t("viewProducts")}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-servido-200 text-servido-800">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("backHome")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
