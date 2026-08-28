"use client"

import Link from "next/link"
import {
  Handshake,
  Heart,
  Lightbulb,
  Shield,
  Store,
  Target,
  Users,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const valueIcons = [Shield, Lightbulb, Users, Handshake, Target] as const

export default function AcercaDeNosotrosPage() {
  const t = useTranslations("infoAbout")
  const values = valueIcons.map((icon, i) => ({
    icon,
    title: t(`values.${i}.title`),
    description: t(`values.${i}.description`),
  }))

  const highlights = [
    { label: t("highlights.marketplace.label"), value: t("highlights.marketplace.value") },
    { label: t("highlights.community.label"), value: t("highlights.community.value") },
    { label: t("highlights.security.label"), value: t("highlights.security.value") },
  ]

  return (
    <InfoPageShell
      badge={t("badge")}
      badgeIcon={Users}
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-white px-5 py-4 text-center shadow-[0_12px_32px_-24px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-servido-800">
              {item.label}
            </p>
            <p className="mt-1.5 text-sm font-medium text-servido-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoSection title={t("missionTitle")}>
          <p>{t("missionBody")}</p>
        </InfoSection>

        <InfoSection title={t("visionTitle")}>
          <p>{t("visionBody")}</p>
        </InfoSection>
      </div>

      <section className="mt-10">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-servido-950 text-servido-gold shadow-md">
            <Heart className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-servido-950">{t("valuesTitle")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl bg-white p-5 shadow-[0_12px_32px_-24px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(46,16,101,0.32)] lg:rounded-3xl"
            >
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-servido-50 text-servido-800">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-servido-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-6">
        <InfoSection title={t("teamTitle")}>
          <p>{t("teamBody")}</p>
          <p>
            {t("teamJoin")}{" "}
            <Link
              href="/trabaja-con-nosotros"
              className="font-semibold text-servido-800 underline-offset-2 hover:underline"
            >
              {t("teamLink")}
            </Link>
            .
          </p>
        </InfoSection>

        <InfoCtaCard
          icon={Store}
          title={t("ctaTitle")}
          description={t("ctaBody")}
          primaryLabel={t("ctaProducts")}
          primaryHref="/products"
          secondaryLabel={t("ctaSell")}
          secondaryHref="/signup?role=seller"
        />
      </div>
    </InfoPageShell>
  )
}
