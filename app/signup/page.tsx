"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile, deleteUser, signOut } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { sendWelcomeEmail } from "@/lib/email-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Bike, Loader2, Mail, Phone, Store, User } from "lucide-react"
import { AuthPageShell, authInputClass, authLabelClass } from "@/components/auth/auth-page-shell"
import { useTranslations } from "next-intl"

export default function SignupPage() {
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"))
      return
    }
    if (password.length < 6) {
      setError(t("passwordMin"))
      return
    }
    if (!name.trim()) {
      setError(t("nameRequired"))
      return
    }
    if (!email.trim()) {
      setError(t("emailRequired"))
      return
    }
    if (!phone.trim()) {
      setError(t("phoneRequired"))
      return
    }
    if (!acceptTerms) {
      setError(t("termsRequired"))
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      const user = userCredential.user

      await updateProfile(user, { displayName: name.trim() })

      const userData = {
        uid: user.uid,
        email: user.email,
        phone: phone.trim(),
        name: name.trim(),
        role: "user",
        isActive: true,
        createdAt: serverTimestamp(),
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
      }

      try {
        await setDoc(doc(db, "users", user.uid), userData)
      } catch (firestoreError) {
        try {
          await deleteUser(user)
        } catch (deleteError) {
          console.error("Error deleting partially created auth user:", deleteError)
          await signOut(auth).catch(() => {})
        }
        throw firestoreError
      }

      await sendWelcomeEmail({
        user_name: name.trim(),
        user_email: normalizedEmail,
        account_type: "buyer",
      })

      router.push("/dashboard/buyer")
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError(t("emailInUseLong"))
      } else if (err.code === "auth/weak-password") {
        setError(t("weakPassword"))
      } else {
        setError(t("signupErrorLong"))
        console.error("Signup error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell
      title={t("signupPageTitle")}
      subtitle={t("signupPageSubtitle")}
      footer={
        <div className="space-y-3 text-center text-sm text-gray-600">
          <p>
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
              {t("loginLink")}
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className={authLabelClass}>
            {t("displayName")}
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${authInputClass} pl-10`}
              required
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email" className={authLabelClass}>
              {t("email")}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${authInputClass} pl-10`}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className={authLabelClass}>
              {t("phone")}
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${authInputClass} pl-10`}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password" className={authLabelClass}>
              {t("password")}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholderMin")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className={authLabelClass}>
              {t("confirmPassword")}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t("passwordPlaceholderConfirm")}
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
            {t("acceptTerms")}{" "}
            <Link
              href="/terminos-y-condiciones"
              target="_blank"
              className="font-semibold text-purple-700 hover:underline"
            >
              {t("termsLink")}
            </Link>{" "}
            Servido
          </Label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
        )}

        <Button
          type="submit"
          className="h-11 w-full rounded-full bg-purple-700 text-base font-semibold shadow-md shadow-purple-200 hover:bg-purple-800"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("signingUp")}
            </>
          ) : (
            t("signupPageTitle")
          )}
        </Button>

        <div className="space-y-3 pt-1">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            {t("partnerOptionsTitle")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/signup/restaurante"
              className="flex items-center gap-3 rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100 transition hover:ring-orange-300"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <Store className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-gray-900">{t("partnerRestaurantCard")}</span>
                <span className="block text-xs text-gray-500">{t("partnerRestaurantHint")}</span>
              </span>
            </Link>
            <Link
              href="/signup/cadete"
              className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 transition hover:ring-sky-400"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Bike className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-gray-900">{t("partnerCadeteCard")}</span>
                <span className="block text-xs text-gray-500">{t("partnerCadeteHint")}</span>
              </span>
            </Link>
          </div>
        </div>
      </form>
    </AuthPageShell>
  )
}
