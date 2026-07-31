import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import ComprasInternacionalesContent from "./compras-internacionales-content"

export default async function ComprasInternacionalesPage() {
  const t = await getTranslations("internationalPurchases")

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
