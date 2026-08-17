"use client"

import Link from "next/link"
import { ArrowRight, Building2, Car, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

type SpotlightVariant = "vehicles" | "properties"

const themes: Record<
  SpotlightVariant,
  {
    surface: string
    glow: string
    kicker: string
    iconWrap: string
    icon: string
    watermark: string
    chip: string
    note: string
    primary: string
    secondary: string
  }
> = {
  vehicles: {
    surface: "bg-gradient-to-br from-[#1a1210] via-[#2b1912] to-[#4a2a0c]",
    glow: "bg-[radial-gradient(ellipse_at_90%_10%,rgba(251,191,36,0.32),transparent_55%)]",
    kicker: "text-amber-200/90",
    iconWrap: "bg-amber-400/15 ring-1 ring-amber-200/30",
    icon: "text-amber-200",
    watermark: "text-amber-300/[0.12]",
    chip: "bg-white/10 text-amber-50 ring-1 ring-white/10",
    note: "text-amber-100/70",
    primary: "bg-amber-400 text-zinc-950 hover:bg-amber-300",
    secondary: "border-white/25 bg-white/10 text-white hover:bg-white/15",
  },
  properties: {
    surface: "bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700",
    glow: "bg-[radial-gradient(ellipse_at_90%_10%,rgba(167,139,250,0.32),transparent_55%)]",
    kicker: "text-purple-200/90",
    iconWrap: "bg-white/10 ring-1 ring-white/25",
    icon: "text-purple-100",
    watermark: "text-purple-200/[0.12]",
    chip: "bg-white/10 text-purple-50 ring-1 ring-white/10",
    note: "text-purple-100/70",
    primary: "bg-white text-servido-800 hover:bg-purple-50",
    secondary: "border-white/25 bg-white/10 text-white hover:bg-white/15",
  },
}

function VerticalSpotlightCard({
  variant,
  kicker,
  title,
  chips,
  note,
  exploreHref,
  exploreLabel,
  publishHref,
  publishLabel,
  icon: Icon,
}: {
  variant: SpotlightVariant
  kicker: string
  title: string
  chips: string[]
  note: string
  exploreHref: string
  exploreLabel: string
  publishHref: string
  publishLabel: string
  icon: LucideIcon
}) {
  const theme = themes[variant]

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-3xl shadow-lg ring-1 ring-white/10",
        theme.surface
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0", theme.glow)} />
      <Icon
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 rotate-[-12deg] sm:h-44 sm:w-44",
          theme.watermark
        )}
      />

      <div className="relative flex min-h-[220px] flex-col p-5 sm:min-h-[240px] sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", theme.iconWrap)}>
            <Icon className={cn("h-4 w-4", theme.icon)} />
          </span>
          <span className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", theme.kicker)}>
            {kicker}
          </span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", theme.chip)}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        <p className={cn("mt-auto pt-5 text-xs font-medium", theme.note)}>{note}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={exploreHref}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition min-[420px]:flex-none",
              theme.primary
            )}
          >
            {exploreLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={publishHref}
            className={cn(
              "inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              theme.secondary
            )}
          >
            {publishLabel}
          </Link>
        </div>
      </div>
    </article>
  )
}

export function HomeVehiclesSpotlight() {
  const th = useTranslations("home")
  const tv = useTranslations("vehicles")
  const chips = (th.raw("vehiclesSpotlightChips") as string[] | undefined) ?? []

  return (
    <VerticalSpotlightCard
      variant="vehicles"
      kicker={th("vehiclesSpotlightKicker")}
      title={th("vehiclesSpotlightTitle")}
      chips={chips}
      note={tv("publishFreeNote")}
      exploreHref="/autos"
      exploreLabel={th("vehiclesSpotlightCta")}
      publishHref="/dashboard/seller/vehicles"
      publishLabel={tv("publishCtaShort")}
      icon={Car}
    />
  )
}

export function HomePropertiesSpotlight() {
  const th = useTranslations("home")
  const tp = useTranslations("properties")
  const chips = (th.raw("propertiesSpotlightChips") as string[] | undefined) ?? []

  return (
    <VerticalSpotlightCard
      variant="properties"
      kicker={th("propertiesSpotlightKicker")}
      title={th("propertiesSpotlightTitle")}
      chips={chips}
      note={tp("publishFreeNote")}
      exploreHref="/propiedades"
      exploreLabel={th("propertiesSpotlightCta")}
      publishHref="/dashboard/seller/properties"
      publishLabel={tp("publishCtaShort")}
      icon={Building2}
    />
  )
}

export function HomeVerticalSpotlights() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <HomeVehiclesSpotlight />
      <HomePropertiesSpotlight />
    </div>
  )
}
