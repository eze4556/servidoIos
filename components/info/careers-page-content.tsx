"use client"

import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Code2,
  Coffee,
  GraduationCap,
  Heart,
  LineChart,
  Mail,
  Megaphone,
  Palette,
  Rocket,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const highlightKeys = ["modality", "location", "team"] as const

const benefitMeta: Record<string, { icon: LucideIcon; accent: string }> = {
  growth: { icon: Rocket, accent: "from-purple-500/10 to-violet-500/5" },
  flexible: { icon: Coffee, accent: "from-amber-500/10 to-orange-500/5" },
  stack: { icon: Zap, accent: "from-sky-500/10 to-blue-500/5" },
  team: { icon: Users, accent: "from-emerald-500/10 to-teal-500/5" },
  learning: { icon: GraduationCap, accent: "from-rose-500/10 to-pink-500/5" },
  impact: { icon: Heart, accent: "from-fuchsia-500/10 to-purple-500/5" },
}

const areaIcons: Record<string, LucideIcon> = {
  dev: Code2,
  design: Palette,
  ops: LineChart,
  marketing: Megaphone,
}

export function CareersPageContent() {
  const t = useTranslations("infoCareers")
  const benefitOrder = t.raw("benefitOrder") as string[]
  const areaOrder = t.raw("areaOrder") as string[]
  const processOrder = t.raw("processOrder") as string[]
  const faqOrder = t.raw("faqOrder") as string[]
  const checklist = t.raw("checklist") as string[]
  const culturePillars = t.raw("culturePillars") as string[]

  const mailSubject = encodeURIComponent(t("applyMailSubject"))

  return (
    <InfoPageShell badge={t("badge")} badgeIcon={Briefcase} title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {highlightKeys.map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-purple-100 bg-white px-5 py-4 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              {t(`highlights.${key}.label`)}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{t(`highlights.${key}.value`)}</p>
          </div>
        ))}
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-5">
        <InfoSection title={t("whyTitle")} className="lg:col-span-3">
          <p>{t("whyP1")}</p>
          <p>{t("whyP2")}</p>
        </InfoSection>

        <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-900 to-violet-950 p-6 text-white shadow-lg lg:col-span-2">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-400/25 blur-2xl" />
          <div className="relative z-10">
            <Sparkles className="mb-3 h-6 w-6 text-purple-200" />
            <p className="text-lg font-semibold leading-snug">&ldquo;{t("quote")}&rdquo;</p>
            <p className="mt-4 text-sm text-purple-200">{t("quoteAuthor")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {culturePillars.map((pillar) => (
                <span
                  key={pillar}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-purple-100 ring-1 ring-white/15"
                >
                  {pillar}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t("benefitsTitle")}</h2>
              <p className="text-sm text-gray-500">{t("benefitsSubtitle")}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefitOrder.map((id) => {
            const meta = benefitMeta[id]
            if (!meta) return null
            const Icon = meta.icon
            return (
              <div
                key={id}
                className={`group rounded-2xl border border-purple-100/80 bg-gradient-to-br ${meta.accent} bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-purple-900 text-white shadow-sm transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-gray-900">{t(`benefits.${id}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`benefits.${id}.description`)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{t("areasTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("areasSubtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {areaOrder.map((id) => {
            const Icon = areaIcons[id]
            if (!Icon) return null
            return (
              <div
                key={id}
                className="flex gap-4 rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-900">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{t(`areas.${id}.title`)}</h3>
                  <p className="mt-1 text-sm text-gray-600">{t(`areas.${id}.description`)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-purple-100/80 bg-purple-50/40 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900">{t("processTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("processSubtitle")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {processOrder.map((id) => (
            <div key={id} className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-purple-100/80">
              <span className="text-3xl font-bold text-purple-200">{t(`process.${id}.step`)}</span>
              <h3 className="mt-2 font-semibold text-gray-900">{t(`process.${id}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`process.${id}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="relative mb-10 overflow-hidden rounded-3xl border border-purple-200/60 bg-gradient-to-br from-[#2d0057] via-purple-900 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-violet-300/15 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Mail className="h-5 w-5" />
            </span>
            <h3 className="text-2xl font-bold tracking-tight">{t("applyTitle")}</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-purple-100">{t("applyBody")}</p>
            <a
              href="mailto:servidoarg@gmail.com"
              className="mt-5 flex w-full min-w-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/15 sm:max-w-md sm:justify-start sm:text-left"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              servidoarg@gmail.com
            </a>
            <div className="mt-6 w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-purple-900 hover:bg-purple-50"
              >
                <a href={`mailto:servidoarg@gmail.com?subject=${mailSubject}`}>{t("applyCta")}</a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
            <p className="mb-4 text-sm font-semibold text-purple-100">{t("checklistTitle")}</p>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-purple-50">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900">{t("faqTitle")}</h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">{t("faqSubtitle")}</p>
        <div className="space-y-3">
          {faqOrder.map((id) => (
            <details
              key={id}
              className="group rounded-2xl border border-purple-100/80 bg-white shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                {t(`faqs.${id}.question`)}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-900 transition-transform group-open:rotate-180">
                  <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                </span>
              </summary>
              <div className="border-t border-purple-50 px-5 pb-4 pt-1">
                <p className="text-sm leading-relaxed text-gray-600">{t(`faqs.${id}.answer`)}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <InfoCtaCard
        icon={Users}
        title={t("cta.title")}
        description={t("cta.description")}
        primaryLabel={t("cta.primaryLabel")}
        primaryHref={t("cta.primaryHref")}
        secondaryLabel={t("cta.secondaryLabel")}
        secondaryHref={t("cta.secondaryHref")}
      />
    </InfoPageShell>
  )
}
