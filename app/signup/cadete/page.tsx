"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Bike,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  Clock,
  Navigation,
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
import { signupCadete } from "@/lib/auth/signup-partner"
import { cn } from "@/lib/utils"

const VEHICLE_IDS = ["bicycle", "motorcycle", "car", "on_foot"] as const

export default function CadeteSignupPage() {
  const router = useRouter()
  const t = useTranslations("signupCadete")
  const tAuth = useTranslations("auth")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [zone, setZone] = useState("")
  const [vehicle, setVehicle] = useState<string>("motorcycle")
  const [documentId, setDocumentId] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (!zone.trim() || !documentId.trim()) {
      setError(t("errorZoneDocument"))
      return
    }

    setLoading(true)
    try {
      await signupCadete({ name, email, phone, password, zone, vehicle, documentId })
      router.push("/dashboard/cadete")
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string }
      if (firebaseErr.code === "auth/email-already-in-use") {
        setError(tAuth("emailInUseLong"))
      } else if (firebaseErr.code === "auth/weak-password") {
        setError(tAuth("weakPassword"))
      } else {
        setError(tAuth("signupErrorLong"))
        console.error("Cadete signup error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <PartnerSignupShell
      variant="cadete"
      icon={Bike}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      highlights={[
        { icon: Navigation, text: t("highlightOrders") },
        { icon: Clock, text: t("highlightSchedule") },
        { icon: Bike, text: t("highlightPanel") },
      ]}
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
        <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">{t("sectionTitle")}</p>
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone" className={authLabelClass}>
                {t("zoneLabel")}
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="zone"
                  placeholder={t("zonePlaceholder")}
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={authLabelClass}>{t("vehicleLabel")}</Label>
              <Select value={vehicle} onValueChange={setVehicle}>
                <SelectTrigger className={authInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t(`vehicles.${id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentId" className={authLabelClass}>
                {t("documentLabel")}
              </Label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="documentId"
                  placeholder={t("documentPlaceholder")}
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className={authLabelClass}>
            {t("fullNameLabel")}
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
