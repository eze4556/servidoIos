"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { BlockedUsers } from "@/components/safety/blocked-users"
import { DeleteAccountSection } from "@/components/profile/delete-account-section"

export default function AccountPage() {
  const t = useTranslations("deleteAccount")
  const { currentUser, authLoading, getDashboardLink } = useAuth()

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-gray-700">{t("loginRequired")}</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-servido-950 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("goLogin")}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Link
          href={getDashboardLink()}
          className="inline-flex items-center gap-1 text-sm font-medium text-servido-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToPanel")}
        </Link>
        <h1 className="text-2xl font-bold text-servido-950">{t("pageTitle")}</h1>
        <p className="text-sm text-gray-600">{t("pageSubtitle")}</p>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{t("email")}</p>
        <p className="mt-1 font-medium text-gray-900">{currentUser.firebaseUser.email}</p>
        {(currentUser.name || currentUser.firebaseUser.displayName) && (
          <>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-500">
              {t("name")}
            </p>
            <p className="mt-1 font-medium text-gray-900">
              {currentUser.name || currentUser.firebaseUser.displayName}
            </p>
          </>
        )}
      </div>

      <BlockedUsers />
      <DeleteAccountSection />
    </div>
  )
}
