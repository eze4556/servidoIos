"use client"

import { Suspense } from "react"
import { useTranslations } from "next-intl"
import ComprasInternacionalesContent from "./compras-internacionales-content"

export default function ComprasInternacionalesPage() {
  const t = useTranslations("internationalPurchases")

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-gray-500">{t("title")}…</div>
      }
    >
      <ComprasInternacionalesContent />
    </Suspense>
  )
}
