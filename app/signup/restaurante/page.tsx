"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import type { DeliveryMode } from "@/types/restaurant"
import { DELIVERY_MODE_LABELS } from "@/types/restaurant"
import { cn } from "@/lib/utils"

export default function RestaurantSignupPage() {
  const router = useRouter()
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones para continuar.")
      return
    }
    if (!restaurantName.trim() || !address.trim()) {
      setError("Completá el nombre del local y la dirección.")
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
        setError("Este correo electrónico ya está en uso.")
      } else if (firebaseErr.code === "auth/weak-password") {
        setError("La contraseña es demasiado débil.")
      } else {
        setError("Error al crear la cuenta. Por favor, inténtalo de nuevo.")
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
    const title = isStoreSeller
      ? "Ya tenés una cuenta de vendedor"
      : "Ya iniciaste sesión"
    const description = isStoreSeller
      ? "Esta cuenta es de tienda/vendedor. No se puede convertir a restaurante desde acá. Si querés registrar un restaurante, cerrá sesión y usá otro correo, o contactá a soporte."
      : "Para registrar un restaurante nuevo tenés que cerrar sesión primero."

    return (
      <PartnerSignupShell
        variant="restaurant"
        icon={UtensilsCrossed}
        heroTitle="Sumá tu restaurante a Servido"
        heroSubtitle="Recibí pedidos online, gestioná tu menú y llegá a más clientes en tu zona."
        highlights={[
          { icon: ClipboardList, text: "Panel de pedidos en tiempo real" },
          { icon: TrendingUp, text: "Mayor visibilidad en tu zona" },
          { icon: Store, text: "Menú digital fácil de actualizar" },
        ]}
        formTitle={title}
        formSubtitle={description}
      >
        <div className="space-y-3">
          <Button asChild className="h-11 w-full rounded-full bg-servido-800 hover:bg-servido-900">
            <Link href={getDashboardLink()}>Ir a mi panel</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-full"
            onClick={() => void handleLogout()}
          >
            Cerrar sesión
          </Button>
          <Button asChild variant="ghost" className="h-11 w-full rounded-full">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </PartnerSignupShell>
    )
  }

  return (
    <PartnerSignupShell
      variant="restaurant"
      icon={UtensilsCrossed}
      heroTitle="Sumá tu restaurante a Servido"
      heroSubtitle="Recibí pedidos online, gestioná tu menú y llegá a más clientes en tu zona."
      highlights={[
        { icon: ClipboardList, text: "Panel de pedidos en tiempo real" },
        { icon: TrendingUp, text: "Mayor visibilidad en tu zona" },
        { icon: Store, text: "Menú digital fácil de actualizar" },
      ]}
      formTitle="Registro de restaurante"
      formSubtitle="Creá tu cuenta y empezá a recibir pedidos"
      footer={
        <p className="text-center text-sm text-gray-600">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl bg-servido-gold/10 p-4 ring-1 ring-servido-gold/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-servido-800">Datos del local</p>
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName" className={authLabelClass}>
                Nombre del restaurante
              </Label>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="restaurantName"
                  placeholder="Mi Restaurante"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className={authLabelClass}>
                Dirección
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="address"
                  placeholder="Calle, número, ciudad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={authLabelClass}>Modalidad de entrega</Label>
              <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}>
                <SelectTrigger className={authInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {DELIVERY_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className={authLabelClass}>
            Nombre del responsable
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="name"
              placeholder="Juan Pérez"
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
                className={cn(authInputClass, "pl-10")}
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
                className={cn(authInputClass, "pl-10")}
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
            <Link href="/terminos-y-condiciones" target="_blank" className="font-semibold text-purple-700 hover:underline">
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
          className="h-11 w-full rounded-full bg-servido-800 text-base font-semibold shadow-md shadow-purple-200 hover:bg-servido-900"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            "Registrar mi restaurante"
          )}
        </Button>
      </form>
    </PartnerSignupShell>
  )
}
