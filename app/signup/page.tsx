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

export default function SignupPage() {
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
      setError("Las contraseñas no coinciden.")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (!name.trim()) {
      setError("Por favor, ingresa tu nombre.")
      return
    }
    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico.")
      return
    }
    if (!phone.trim()) {
      setError("Por favor, ingresa tu número de teléfono.")
      return
    }
    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones para continuar.")
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
        setError("Este correo electrónico ya está en uso.")
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es demasiado débil.")
      } else {
        setError("Error al crear la cuenta. Por favor, inténtalo de nuevo.")
        console.error("Signup error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell
      wide
      title="Crear cuenta"
      subtitle="Elegí tu tipo de cuenta y completá tus datos"
      footer={
        <p className="text-center text-sm text-gray-600">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <Label className={`${authLabelClass} mb-3 block`}>Tipo de cuenta</Label>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1.5 ring-1 ring-gray-200">
            {[
              { value: "buyer" as const, label: "Comprar", icon: ShoppingBag },
              { value: "seller" as const, label: "Vender", icon: Store },
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
                Quiero {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className={authLabelClass}>
            Nombre completo
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
              Correo electrónico
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
              Teléfono
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
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className={authLabelClass}>
              Confirmar contraseña
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repetí tu contraseña"
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
            Acepto los{" "}
            <Link
              href="/terminos-y-condiciones"
              target="_blank"
              className="font-semibold text-purple-700 hover:underline"
            >
              términos y condiciones
            </Link>{" "}
            de Servido
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
              Creando cuenta...
            </>
          ) : (
            "Crear cuenta"
          )}
        </Button>
      </form>
    </AuthPageShell>
  )
}
