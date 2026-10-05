"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bike, Check, Loader2, Package, PackagePlus, Store, TrendingUp, UtensilsCrossed } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  FOOD_BUSINESS_KINDS,
  type FoodBusinessKind,
  type SellCategory,
} from "@/types/restaurant"

export type AccountGrowMode = "store" | "publish" | "cadete"

const VEHICLE_IDS = ["bicycle", "motorcycle", "car", "on_foot"] as const

type OpenStorePanelProps = {
  mode?: AccountGrowMode
  onModeChange?: (mode: AccountGrowMode) => void
}

export function OpenStorePanel({ mode = "store", onModeChange }: OpenStorePanelProps) {
  const t = useTranslations("buyerDashboard.openStore")
  const tCadete = useTranslations("signupCadete")
  const tApi = useTranslations("apiErrors")
  const { currentUser, refreshUserProfile } = useAuth()
  const router = useRouter()

  const [activeMode, setActiveMode] = useState<AccountGrowMode>(mode)
  const [sellCategory, setSellCategory] = useState<SellCategory | null>(null)
  const [foodBusinessKind, setFoodBusinessKind] = useState<FoodBusinessKind | null>(null)
  const [storeName, setStoreName] = useState(
    currentUser?.name || currentUser?.firebaseUser.displayName || ""
  )
  const [location, setLocation] = useState<BusinessLocation | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [zone, setZone] = useState("")
  const [vehicle, setVehicle] = useState<string>("motorcycle")
  const [documentId, setDocumentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveMode(mode)
    setError(null)
    setAcceptTerms(false)
    if (mode === "publish") {
      setSellCategory("products")
      setFoodBusinessKind(null)
    } else if (mode === "store") {
      setSellCategory(null)
      setFoodBusinessKind(null)
    }
  }, [mode])

  const selectMode = (next: AccountGrowMode) => {
    setActiveMode(next)
    setError(null)
    setAcceptTerms(false)
    if (next === "publish") {
      setSellCategory("products")
      setFoodBusinessKind(null)
    } else if (next === "store") {
      setSellCategory(null)
      setFoodBusinessKind(null)
    }
    onModeChange?.(next)
  }

  const canSubmitStore =
    Boolean(sellCategory) &&
    (sellCategory !== "food" || Boolean(foodBusinessKind)) &&
    storeName.trim().length >= 2 &&
    acceptTerms &&
    hasValidCoordinates(location?.latitude, location?.longitude) &&
    Boolean(location?.label?.trim())

  const canSubmitCadete =
    zone.trim().length >= 2 &&
    documentId.trim().length >= 4 &&
    ALLOWED_VEHICLE(vehicle) &&
    acceptTerms

  const handleStoreSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmitStore || loading || !sellCategory) return
    if (sellCategory === "food" && !foodBusinessKind) return
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
          sellCategory,
          foodBusinessKind: sellCategory === "food" ? foodBusinessKind : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("submitFailed"))
      await refreshUserProfile()

      const isFood = data.businessType === "restaurant" || sellCategory === "food"
      if (isFood) {
        router.replace("/dashboard/restaurant")
      } else if (activeMode === "publish") {
        router.replace("/dashboard/seller?tab=addProduct")
      } else {
        router.replace("/dashboard/seller")
      }
      router.refresh()
    } catch (err) {
      setError(describeApiError(err, tApi, t("submitFailed")))
    } finally {
      setLoading(false)
    }
  }

  const handleCadeteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmitCadete || loading) return
    setLoading(true)
    setError(null)
    try {
      const user = auth.currentUser
      if (!user) throw new Error(t("notLoggedIn"))
      const token = await user.getIdToken()
      const res = await fetch(apiUrl("/api/cadete/become"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          zone: zone.trim(),
          vehicle,
          documentId: documentId.trim(),
          acceptTerms,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("cadeteSubmitFailed"))
      await refreshUserProfile()
      router.replace("/dashboard/cadete")
      router.refresh()
    } catch (err) {
      setError(describeApiError(err, tApi, t("cadeteSubmitFailed")))
    } finally {
      setLoading(false)
    }
  }

  const options: {
    id: AccountGrowMode
    title: string
    hint: string
    icon: typeof Store
    accent: string
  }[] = [
    {
      id: "store",
      title: t("storeCardTitle"),
      hint: t("storeCardHint"),
      icon: Store,
      accent: "bg-servido-50/80 text-servido-800 ring-servido-100",
    },
    {
      id: "publish",
      title: t("publishCardTitle"),
      hint: t("publishCardHint"),
      icon: PackagePlus,
      accent: "bg-violet-50/80 text-violet-800 ring-violet-100",
    },
    {
      id: "cadete",
      title: t("cadeteCardTitle"),
      hint: t("cadeteCardHint"),
      icon: Bike,
      accent: "bg-sky-50/80 text-sky-800 ring-sky-100",
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map(({ id, title, hint, icon: Icon, accent }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectMode(id)}
            className={cn(
              "rounded-2xl p-4 text-left ring-1 transition",
              accent,
              activeMode === id ? "ring-2 ring-offset-1 ring-servido-700" : "hover:brightness-[0.98]"
            )}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-1 text-xs text-gray-600">{hint}</p>
          </button>
        ))}
      </div>

      <Link
        href="/dashboard/buyer?tab=reseller"
        className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 transition hover:ring-servido-200"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{t("resellerCardTitle")}</p>
          <p className="mt-1 text-xs text-gray-600">{t("resellerCardHint")}</p>
        </div>
      </Link>

      {(activeMode === "store" || activeMode === "publish") && (
        <form
          onSubmit={(e) => void handleStoreSubmit(e)}
          className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {activeMode === "publish" ? t("publishFormTitle") : t("formTitle")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeMode === "publish" ? t("publishFormSubtitle") : t("formSubtitle")}
            </p>
          </div>

          {activeMode === "store" && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">{t("sellCategoryTitle")}</Label>
              <p className="text-xs text-gray-500">{t("sellCategoryHint")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSellCategory("food")
                    setError(null)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-sm font-semibold ring-1 transition",
                    sellCategory === "food"
                      ? "bg-orange-50 text-orange-900 ring-orange-300"
                      : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-white"
                  )}
                >
                  <UtensilsCrossed className="h-6 w-6" />
                  {t("sellFood")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellCategory("products")
                    setFoodBusinessKind(null)
                    setError(null)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-sm font-semibold ring-1 transition",
                    sellCategory === "products"
                      ? "bg-violet-50 text-violet-900 ring-violet-300"
                      : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-white"
                  )}
                >
                  <Package className="h-6 w-6" />
                  {t("sellProducts")}
                </button>
              </div>
            </div>
          )}

          {activeMode === "store" && sellCategory === "food" && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">{t("foodKindTitle")}</Label>
              <p className="text-xs text-gray-500">{t("foodKindHint")}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FOOD_BUSINESS_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setFoodBusinessKind(kind)
                      setError(null)
                    }}
                    className={cn(
                      "rounded-xl px-3 py-3 text-left text-sm font-medium ring-1 transition",
                      foodBusinessKind === kind
                        ? "bg-servido-800 text-white ring-servido-800"
                        : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {t(`foodKinds.${kind}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            disabled={!canSubmitStore || loading}
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
                {activeMode === "publish"
                  ? t("publishSubmitButton")
                  : sellCategory === "food"
                    ? t("submitFoodButton")
                    : t("submitButton")}
              </>
            )}
          </Button>
        </form>
      )}

      {activeMode === "cadete" && (
        <form
          onSubmit={(e) => void handleCadeteSubmit(e)}
          className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("cadeteFormTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("cadeteFormSubtitle")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cadete-zone">{tCadete("zoneLabel")}</Label>
            <Input
              id="cadete-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder={tCadete("zonePlaceholder")}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>{tCadete("vehicleLabel")}</Label>
            <Select value={vehicle} onValueChange={setVehicle}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {tCadete(`vehicles.${id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cadete-document">{tCadete("documentLabel")}</Label>
            <Input
              id="cadete-document"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder={tCadete("documentPlaceholder")}
              className="rounded-xl"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <Checkbox
              checked={acceptTerms}
              onCheckedChange={(v) => setAcceptTerms(v === true)}
              className="mt-0.5"
            />
            <span>
              {t("cadeteTermsPrefix")}{" "}
              <Link href="/terminos-y-condiciones" className="font-semibold text-servido-800 underline">
                {t("termsLink")}
              </Link>
              {t("cadeteTermsSuffix")}
            </span>
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmitCadete || loading}
            className="h-12 w-full rounded-full bg-sky-700 text-base font-semibold hover:bg-sky-800"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("cadeteSubmitting")}
              </>
            ) : (
              <>
                <Bike className="mr-2 h-4 w-4" />
                {t("cadeteSubmitButton")}
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}

function ALLOWED_VEHICLE(value: string) {
  return VEHICLE_IDS.includes(value as (typeof VEHICLE_IDS)[number])
}
