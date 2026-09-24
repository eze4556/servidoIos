"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, Store, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"
import { auth } from "@/lib/firebase"
import { apiUrl } from "@/lib/api-base"
import { describeApiError } from "@/lib/i18n/translate-client-error"
import { useAuth } from "@/contexts/auth-context"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import { BusinessLocationPicker } from "@/components/location/business-location-picker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function OpenStorePanel() {
  const t = useTranslations("buyerDashboard.openStore")
  const tApi = useTranslations("apiErrors")
  const { currentUser, refreshUserProfile } = useAuth()
  const router = useRouter()

  const [storeName, setStoreName] = useState(
    currentUser?.name || currentUser?.firebaseUser.displayName || ""
  )
  const [location, setLocation] = useState<BusinessLocation | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    storeName.trim().length >= 2 &&
    acceptTerms &&
    hasValidCoordinates(location?.latitude, location?.longitude) &&
    Boolean(location?.label?.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      const user = auth.currentUser
      if (!user) throw new Error(t("notLoggedIn"))
      const token = await user.getIdToken()
      const res = await fetch(apiUrl("/api/seller/become"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName: storeName.trim(),
          acceptTerms,
          location,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("submitFailed"))
      await refreshUserProfile()
      router.replace("/dashboard/seller")
      router.refresh()
    } catch (err) {
      setError(describeApiError(err, tApi, t("submitFailed")))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-servido-50/80 p-4 ring-1 ring-servido-100">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-servido-800 shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{t("storeCardTitle")}</p>
          <p className="mt-1 text-xs text-gray-600">{t("storeCardHint")}</p>
        </div>
        <Link
          href="/dashboard/buyer?tab=reseller"
          className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 transition hover:ring-servido-200"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{t("resellerCardTitle")}</p>
          <p className="mt-1 text-xs text-gray-600">{t("resellerCardHint")}</p>
        </Link>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t("formTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("formSubtitle")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store-name">{t("storeNameLabel")}</Label>
          <Input
            id="store-name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder={t("storeNamePlaceholder")}
            className="rounded-xl"
            maxLength={80}
          />
        </div>

        <BusinessLocationPicker
          value={location}
          onChange={setLocation}
          label={t("locationLabel")}
          helperText={t("locationHelper")}
        />

        <label className="flex items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
          <Checkbox
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(v === true)}
            className="mt-0.5"
          />
          <span>
            {t("termsPrefix")}{" "}
            <Link href="/terminos-y-condiciones" className="font-semibold text-servido-800 underline">
              {t("termsLink")}
            </Link>
            {t("termsSuffix")}
          </span>
        </label>

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit || loading}
          className="h-12 w-full rounded-full bg-servido-800 text-base font-semibold hover:bg-servido-900"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("submitting")}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {t("submitButton")}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
