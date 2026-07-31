"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, Globe2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const COUNTRY_IDS = ["china"] as const
type CountryId = (typeof COUNTRY_IDS)[number]

function isCountryId(value: string | null): value is CountryId {
  return value !== null && (COUNTRY_IDS as readonly string[]).includes(value)
}

export default function ComprasInternacionalesContent() {
  const t = useTranslations("internationalPurchases")
  const searchParams = useSearchParams()
  const selected = searchParams.get("pais")
  const selectedCountry = isCountryId(selected?.toLowerCase() ?? null) ? selected!.toLowerCase() : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/40">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Button asChild variant="ghost" className="mb-6 -ml-2 rounded-full text-servido-800">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backHome")}
          </Link>
        </Button>

        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-servido-700/10 text-servido-800">
            <Globe2 className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">{t("subtitle")}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {COUNTRY_IDS.map((id) => {
            const active = selectedCountry === id
            return (
              <Link
                key={id}
                href={`/compras-internacionales?pais=${id}`}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? "border-servido-600 bg-servido-50 ring-2 ring-servido-600/20"
                    : "border-gray-200 bg-white hover:border-servido-300 hover:shadow-md"
                }`}
              >
                <p className="text-lg font-semibold text-gray-900">{t(`countries.${id}.name`)}</p>
                <p className="mt-1 text-sm text-gray-500">{t(`countries.${id}.hint`)}</p>
              </Link>
            )
          })}
        </div>

        {selectedCountry === "china" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center shadow-sm">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900">
              <Sparkles className="h-3.5 w-3.5" />
              {t("comingSoonBadge")}
            </span>
            <h2 className="text-xl font-bold text-gray-900">{t("countries.china.comingTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{t("countries.china.comingBody")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full bg-servido-700 hover:bg-servido-800">
                <Link href="/products">{t("browseLocal")}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/compras-internacionales">{t("chooseOther")}</Link>
              </Button>
            </div>
          </div>
        )}

        {!selectedCountry && (
          <p className="mt-8 text-center text-sm text-gray-500">{t("pickCountry")}</p>
        )}
      </div>
    </div>
  )
}
