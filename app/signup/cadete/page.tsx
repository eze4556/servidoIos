"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

const vehicleOptions = ["Bicicleta", "Moto", "Auto", "A pie"]

export default function CadeteSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [zone, setZone] = useState("")
  const [vehicle, setVehicle] = useState("Moto")
  const [documentId, setDocumentId] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (!zone.trim() || !documentId.trim()) {
      setError("Completá tu zona y documento.")
      return
    }

    setLoading(true)
    try {
      await signupCadete({ name, email, phone, password, zone, vehicle, documentId })
      router.push("/dashboard/cadete")
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string }
      if (firebaseErr.code === "auth/email-already-in-use") {
        setError("Este correo electrónico ya está en uso.")
      } else if (firebaseErr.code === "auth/weak-password") {
        setError("La contraseña es demasiado débil.")
      } else {
        setError("Error al crear la cuenta. Por favor, inténtalo de nuevo.")
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
      heroTitle="Trabajá como cadete en Servido"
      heroSubtitle="Sumate a la red de delivery, elegí tu zona y empezá a generar ingresos con flexibilidad."
      highlights={[
        { icon: Navigation, text: "Pedidos asignados en tu zona" },
        { icon: Clock, text: "Horarios flexibles" },
        { icon: Bike, text: "Panel móvil para gestionar entregas" },
      ]}
      formTitle="Registro de cadete"
      formSubtitle="Completá tus datos para postularte"
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
        <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Datos de cadete</p>
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone" className={authLabelClass}>
                Zona de trabajo
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="zone"
                  placeholder="Ej: Centro, Norte, Zona sur"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className={cn(authInputClass, "pl-10")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={authLabelClass}>Vehículo</Label>
              <Select value={vehicle} onValueChange={setVehicle}>
                <SelectTrigger className={authInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleOptions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentId" className={authLabelClass}>
                DNI / Documento
              </Label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="documentId"
                  placeholder="12345678"
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
            Nombre completo
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
              Enviando postulación...
            </>
          ) : (
            "Postularme como cadete"
          )}
        </Button>
      </form>
    </PartnerSignupShell>
  )
}
