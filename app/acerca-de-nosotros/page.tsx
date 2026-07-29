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
import { getTranslations } from "next-intl/server"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const valueIcons = [Shield, Lightbulb, Users, Handshake, Target] as const

export default async function AcercaDeNosotrosPage() {
  const t = await getTranslations("infoAbout")
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
            className="rounded-2xl border border-purple-100 bg-white px-5 py-4 text-center shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">{item.label}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
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
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900">
            <Heart className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-semibold text-gray-900">{t("valuesTitle")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-900">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-6">
        <InfoSection title={t("teamTitle")}>
          <p>{t("teamBody")}</p>
          <p>
            {t("teamJoin")}{" "}
            <Link href="/trabaja-con-nosotros" className="font-medium text-purple-900 underline-offset-2 hover:underline">
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
