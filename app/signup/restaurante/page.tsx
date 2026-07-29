"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Loader2,
  Mail,
  MapPin,
  Phone,
  Store,
  User,
  UtensilsCrossed,
  ClipboardList,
  TrendingUp,
} from "lucide-react"
import { PartnerSignupShell, authInputClass, authLabelClass } from "@/components/auth/partner-signup-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { signupRestaurant } from "@/lib/auth/signup-partner"
import { getDeliveryModeLabel } from "@/lib/i18n/restaurant-labels"
import type { DeliveryMode } from "@/types/restaurant"
import { cn } from "@/lib/utils"

const DELIVERY_MODES: DeliveryMode[] = ["delivery_propio", "retiro_en_local", "ambos"]

export default function RestaurantSignupPage() {
  const router = useRouter()
  const t = useTranslations("signupRestaurant")
  const tAuth = useTranslations("auth")
  const tRestaurants = useTranslations("restaurants")
  const { currentUser, authLoading, getDashboardLink, handleLogout } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [restaurantName, setRestaurantName] = useState("")
  const [address, setAddress] = useState("")
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("ambos")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isRestaurantSeller =
    currentUser?.role === "seller" && currentUser.businessType === "restaurant"
  const isStoreSeller =
    currentUser?.role === "seller" && currentUser.businessType !== "restaurant"

  useEffect(() => {
    if (authLoading) return
    if (isRestaurantSeller) {
      router.replace("/dashboard/restaurant")
    }
  }, [authLoading, isRestaurantSeller, router])

  const heroProps = {
    variant: "restaurant" as const,
    icon: UtensilsCrossed,
    heroTitle: t("heroTitle"),
    heroSubtitle: t("heroSubtitle"),
    highlights: [
      { icon: ClipboardList, text: t("highlightOrders") },
      { icon: TrendingUp, text: t("highlightVisibility") },
      { icon: Store, text: t("highlightMenu") },
    ],
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(tAuth("passwordMismatch"))
      return
    }
    if (password.length < 6) {
      setError(tAuth("passwordMin"))
      return
    }
    if (!acceptTerms) {
      setError(tAuth("termsRequired"))
      return
    }
    if (!restaurantName.trim() || !address.trim()) {
      setError(t("errorVenue"))
      return
    }

    setLoading(true)
    try {
      await signupRestaurant({
        name,
        email,
        phone,
        password,
        restaurantName,
        address,
        deliveryMode,
      })
      router.push("/dashboard/restaurant/onboarding")
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string }
      if (firebaseErr.code === "auth/email-already-in-use") {
        setError(tAuth("emailInUseLong"))
      } else if (firebaseErr.code === "auth/weak-password") {
        setError(tAuth("weakPassword"))
      } else {
        setError(tAuth("signupErrorLong"))
        console.error("Restaurant signup error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || isRestaurantSeller) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  if (currentUser) {
    return (
      <PartnerSignupShell
        {...heroProps}
        formTitle={isStoreSeller ? t("sellerAccountTitle") : t("loggedInTitle")}
        formSubtitle={isStoreSeller ? t("sellerAccountBody") : t("logoutToRegister")}
      >
        <div className="space-y-3">
          <Button asChild className="h-11 w-full rounded-full bg-servido-800 hover:bg-servido-900">
            <Link href={getDashboardLink()}>{t("goToPanel")}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-full"
            onClick={() => void handleLogout()}
          >
            {t("logout")}
          </Button>
          <Button asChild variant="ghost" className="h-11 w-full rounded-full">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>
      </PartnerSignupShell>
    )
  }

  return (
    <PartnerSignupShell
      {...heroProps}
      formTitle={t("formTitle")}
      formSubtitle={t("formSubtitle")}
      footer={
        <p className="text-center text-sm text-gray-600">
          {tAuth("hasAccount")}{" "}
          <Link href="/login" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
            {tAuth("loginLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl bg-servido-gold/10 p-4 ring-1 ring-servido-gold/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-servido-800">{t("sectionTitle")}</p>
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName" className={authLabelClass}>
                {t("restaurantNameLabel")}
              </Label>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="restaurantName"
                  placeholder={t("restaurantNamePlaceholder")}
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className={authLabelClass}>
                {t("addressLabel")}
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="address"
                  placeholder={t("addressPlaceholder")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={authLabelClass}>{t("deliveryModeLabel")}</Label>
              <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}>
                <SelectTrigger className={authInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {getDeliveryModeLabel(tRestaurants, mode)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className={authLabelClass}>
            {t("ownerNameLabel")}
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="name"
              placeholder={tAuth("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(authInputClass, "pl-10")}
              required
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email" className={authLabelClass}>
              {tAuth("email")}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder={tAuth("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(authInputClass, "pl-10")}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className={authLabelClass}>
              {tAuth("phone")}
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder={tAuth("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={cn(authInputClass, "pl-10")}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password" className={authLabelClass}>
              {tAuth("password")}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={tAuth("passwordPlaceholderMin")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className={authLabelClass}>
              {tAuth("confirmPassword")}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={tAuth("passwordPlaceholderConfirm")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authInputClass}
              required
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-purple-50/60 p-4 ring-1 ring-purple-100">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            className="mt-0.5"
            required
          />
          <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed text-gray-600">
            {tAuth("acceptTerms")}{" "}
            <Link href="/terminos-y-condiciones" target="_blank" className="font-semibold text-purple-700 hover:underline">
              {tAuth("termsLink")}
            </Link>{" "}
            {tAuth("termsOfServido")}
          </Label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
        )}

        <Button
          type="submit"
          className="h-11 w-full rounded-full bg-servido-800 text-base font-semibold shadow-md shadow-purple-200 hover:bg-servido-900"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>
    </PartnerSignupShell>
  )
}
