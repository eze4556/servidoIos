"use client"

import { Scale, Shield } from "lucide-react"
import { useTranslations } from "next-intl"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"
import { InfoLegalToc } from "@/components/info/info-legal-toc"
import { LegalBlocks, type LegalBlock } from "@/components/info/legal-blocks"

type LegalNamespace = "infoTerms" | "infoPrivacy"

function StructuredLegalPage({ namespace, ctaIcon }: { namespace: LegalNamespace; ctaIcon: typeof Scale }) {
  const t = useTranslations(namespace)
  const sectionOrder = t.raw("sectionOrder") as string[]
  const sectionsData = t.raw("sections") as Record<
    string,
    { title: string; blocks: LegalBlock[] }
  >

  const tocSections = sectionOrder.map((id, index) => ({
    id,
    number: index + 1,
    title: sectionsData[id]?.title ?? id,
  }))

  const CtaIcon = ctaIcon

  return (
    <InfoPageShell
      badge={t("badge")}
      badgeIcon={namespace === "infoTerms" ? Scale : Shield}
      title={t("title")}
      subtitle={t("subtitle")}
      lastUpdated={t("lastUpdated")}
    >
      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10 xl:grid-cols-[260px_1fr]">
        <InfoLegalToc sections={tocSections} />

        <div className="space-y-5">
          {sectionOrder.map((id, index) => {
            const section = sectionsData[id]
            if (!section) return null
            return (
              <InfoSection key={id} id={id} number={index + 1} title={section.title}>
                <LegalBlocks blocks={section.blocks} />
              </InfoSection>
            )
          })}

          <InfoCtaCard
            icon={CtaIcon}
            title={t("cta.title")}
            description={t("cta.description")}
            primaryLabel={t("cta.primaryLabel")}
            primaryHref={t("cta.primaryHref")}
            secondaryLabel={t("cta.secondaryLabel")}
            secondaryHref={t("cta.secondaryHref")}
          />
        </div>
      </div>
    </InfoPageShell>
  )
}

export function TermsPageContent() {
  return <StructuredLegalPage namespace="infoTerms" ctaIcon={Scale} />
}

export function PrivacyPageContent() {
  return <StructuredLegalPage namespace="infoPrivacy" ctaIcon={Shield} />
}
