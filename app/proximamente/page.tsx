"use client"

import { Suspense } from "react"
import { useTranslations } from "next-intl"
import ProximamenteContent from "./proximamente-content"

export default function ProximamentePage() {
  const t = useTranslations("proximamente")

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-gray-500">{t("loading")}</p>
        </div>
      }
    >
      <ProximamenteContent />
    </Suspense>
  )
}
