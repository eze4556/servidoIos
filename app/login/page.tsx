"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, Mail } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { AuthPageShell, authInputClass, authLabelClass } from "@/components/auth/auth-page-shell"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { currentUser, authLoading, getDashboardLink } = useAuth()

  useEffect(() => {
    if (!authLoading && currentUser) {
      const redirectPath = getDashboardLink()
      router.push(redirectPath)
    }
  }, [currentUser, authLoading, getDashboardLink, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Correo electrónico o contraseña incorrectos.")
      } else {
        setError("Error al iniciar sesión. Por favor, inténtalo de nuevo.")
        console.error("Login error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/30">
        <Loader2 className="h-10 w-10 animate-spin text-purple-700" />
      </div>
    )
  }

  return (
    <AuthPageShell
      title="Iniciar sesión"
      subtitle="Bienvenido de nuevo a Servido"
      footer={
        <p className="text-center text-sm text-gray-600">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
            Registrate gratis
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
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
          <Label htmlFor="password" className={authLabelClass}>
            Contraseña
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pl-10`}
              required
            />
          </div>
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
              Ingresando...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </Button>
      </form>
    </AuthPageShell>
  )
}
