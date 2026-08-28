"use client"

import { FileText } from "lucide-react"
import { useTranslations } from "next-intl"

export type LegalTocSection = { id: string; number: number; title: string }

export function InfoLegalToc({ sections }: { sections: LegalTocSection[] }) {
  const tCommon = useTranslations("infoCommon")

  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-28 rounded-2xl bg-white p-4 shadow-[0_12px_32px_-24px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-servido-800">
          <FileText className="h-3.5 w-3.5" />
          {tCommon("tocIndex")}
        </p>
        <ol className="space-y-1 text-sm">
          {sections.map(({ id, number, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block rounded-lg px-2 py-1.5 text-slate-600 transition-colors hover:bg-servido-50 hover:text-servido-900"
              >
                <span className="font-semibold text-servido-800">{number}.</span> {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}
