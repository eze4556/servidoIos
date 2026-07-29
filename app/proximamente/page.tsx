import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import ProximamenteContent from "./proximamente-content"

export default async function ProximamentePage() {
  const t = await getTranslations("proximamente")

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
