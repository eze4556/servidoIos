"use client"

import { FileText } from "lucide-react"
import { useTranslations } from "next-intl"

export type LegalTocSection = { id: string; number: number; title: string }

export function InfoLegalToc({ sections }: { sections: LegalTocSection[] }) {
  const tCommon = useTranslations("infoCommon")

  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-28 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700">
          <FileText className="h-3.5 w-3.5" />
          {tCommon("tocIndex")}
        </p>
        <ol className="space-y-1 text-sm">
          {sections.map(({ id, number, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block rounded-lg px-2 py-1.5 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-900"
              >
                <span className="font-medium text-purple-800">{number}.</span> {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}
