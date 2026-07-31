"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile, deleteUser, signOut } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { sendWelcomeEmail } from "@/lib/email-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Mail, Phone, ShoppingBag, Store, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthPageShell, authInputClass, authLabelClass } from "@/components/auth/auth-page-shell"
import { useTranslations } from "next-intl"

export default function SignupPage() {
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const roleFromQuery = searchParams.get("role")
    if (roleFromQuery === "seller") {
      setAccountType("seller")
    } else {
      setAccountType("buyer")
    }
  }, [searchParams])

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

      const userData: { [key: string]: any } = {
        uid: user.uid,
        email: user.email,
        phone: phone.trim(),
        name: name.trim(),
        role: accountType === "seller" ? "seller" : "user",
        isActive: true,
        createdAt: serverTimestamp(),
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
      }

      if (accountType === "seller") {
        userData.subscription_status = "inactive"
        userData.isSubscribed = false
        userData.productUploadLimit = 0
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
        account_type: accountType,
      })

      if (accountType === "seller") {
        router.push("/dashboard/seller")
      } else {
        router.push("/")
      }
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
      wide
      title={t("signupPageTitle")}
      subtitle={t("signupPageSubtitle")}
      footer={
        <div className="space-y-3 text-center text-sm text-gray-600">
          <p>
            {t("restaurantPrompt")}{" "}
            <Link href="/signup/restaurante" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
              {t("restaurantLink")}
            </Link>
          </p>
          <p>
            {t("cadetePrompt")}{" "}
            <Link href="/signup/cadete" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
              {t("cadeteLink")}
            </Link>
          </p>
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
        <div>
          <Label className={`${authLabelClass} mb-3 block`}>{t("accountType")}</Label>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1.5 ring-1 ring-gray-200">
            {[
              { value: "buyer" as const, label: t("wantBuy"), icon: ShoppingBag },
              { value: "seller" as const, label: t("wantSell"), icon: Store },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold transition-all sm:gap-1.5 sm:px-3 sm:text-sm",
                  accountType === value
                    ? "bg-purple-700 text-white shadow-md shadow-purple-200"
                    : "text-gray-600 hover:bg-white hover:text-purple-800"
                )}
              >
                <Icon className="h-5 w-5" />
                {t("wantTo", { action: label })}
              </button>
            ))}
          </div>
        </div>

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
      </form>
    </AuthPageShell>
  )
}
