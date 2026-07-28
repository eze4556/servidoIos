"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export default function NotFoundPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const t = useTranslations("notFound")

  let dashboardPath = "/login"
  if (currentUser && currentUser.role === "seller") dashboardPath = "/dashboard/seller"
  if (currentUser && currentUser.role === "user") dashboardPath = "/dashboard/buyer"

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-5xl font-bold text-orange-600">{t("title")}</h1>
      <h2 className="text-2xl font-semibold">{t("heading")}</h2>
      <p className="max-w-md text-gray-600">{t("description")}</p>
      <Button onClick={() => router.push(dashboardPath)} className="mt-4 px-6 py-2 text-lg">
        {t("backDashboard")}
      </Button>
    </div>
  )
}
