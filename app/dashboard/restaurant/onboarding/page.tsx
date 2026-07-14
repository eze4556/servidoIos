"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { saveBusinessLocation } from "@/lib/business-location"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import { BusinessLocationPicker } from "@/components/location/business-location-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, UtensilsCrossed, CheckCircle2, ArrowRight } from "lucide-react"
import type { DeliveryMode, Restaurant } from "@/types/restaurant"
import { DELIVERY_MODE_LABELS } from "@/types/restaurant"

export default function RestaurantOnboardingPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState("")
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("ambos")
  const [restaurantName, setRestaurantName] = useState("")
  const [deliveryFee, setDeliveryFee] = useState("300")
  const [businessLocation, setBusinessLocation] = useState<BusinessLocation | null>(null)

  useEffect(() => {
    async function loadRestaurant() {
      if (!currentUser?.restaurantId) {
        setLoading(false)
        return
      }
      const snap = await getDoc(doc(db, "restaurants", currentUser.restaurantId))
      if (snap.exists()) {
        const data = snap.data() as Restaurant
        setRestaurantName(data.name || "")
        setDescription(data.description || "")
        setDeliveryMode(data.deliveryMode || "ambos")
        const fee = Number(data.deliveryFee)
        setDeliveryFee(Number.isFinite(fee) && fee >= 0 ? String(fee) : "300")
        if (data.coordinates && hasValidCoordinates(data.coordinates.latitude, data.coordinates.longitude)) {
          setBusinessLocation({
            label: data.locationLabel || data.address || "",
            city: data.city || data.zone || null,
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude,
          })
        } else if (data.address) {
          // Solo texto: el usuario puede buscar y confirmar en el picker
          setBusinessLocation(null)
        }
        if (data.status === "active" && data.description) {
          router.replace("/dashboard/restaurant")
        }
      }
      setLoading(false)
    }
    void loadRestaurant()
  }, [currentUser?.restaurantId, router])

  const handleSave = async () => {
    if (!currentUser?.restaurantId || !currentUser.firebaseUser.uid) return
    if (!businessLocation || !hasValidCoordinates(businessLocation.latitude, businessLocation.longitude)) {
      return
    }
    setSaving(true)
    try {
      await saveBusinessLocation(currentUser.firebaseUser.uid, businessLocation, {
        restaurantId: currentUser.restaurantId,
      })
      await updateDoc(doc(db, "restaurants", currentUser.restaurantId), {
        name: restaurantName.trim(),
        description: description.trim(),
        deliveryMode,
        deliveryFee: Number.isFinite(Number(deliveryFee)) && Number(deliveryFee) >= 0 ? Number(deliveryFee) : 300,
        status: "active",
        updatedAt: serverTimestamp(),
      })
      router.push("/dashboard/restaurant")
    } catch (err) {
      console.error("Onboarding save error:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  const canSave =
    restaurantName.trim() &&
    businessLocation &&
    hasValidCoordinates(businessLocation.latitude, businessLocation.longitude)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-servido-gold/20 text-servido-800">
            <UtensilsCrossed className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Completá tu perfil</h1>
          <p className="mt-2 text-sm text-gray-600">
            Unos datos más y tu restaurante estará listo para recibir pedidos.
          </p>
        </div>

        <div className="space-y-5 rounded-3xl bg-white p-6 shadow-lg shadow-purple-900/5 ring-1 ring-gray-100 sm:p-8">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Nombre del local</Label>
            <Input
              id="restaurantName"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <BusinessLocationPicker
            value={businessLocation}
            onChange={setBusinessLocation}
            label="Ubicación del local"
            helperText="Buscá tu dirección o ciudad. Así te encuentran en historias cercanas."
          />

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Contá qué tipo de comida ofrecés, especialidades..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Modalidad de entrega</Label>
            <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}>
              <SelectTrigger className="h-11 rounded-xl">
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

          {deliveryMode !== "retiro_en_local" && (
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Precio de envío ($)</Label>
              <Input
                id="deliveryFee"
                type="number"
                min="0"
                step="1"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-gray-500">Lo paga el cliente. Podés cambiarlo después en Perfil.</p>
            </div>
          )}

          <ul className="space-y-2 rounded-2xl bg-purple-50/60 p-4 text-sm text-gray-600">
            {[
              "Tu menú se carga desde el panel de restaurante",
              "Los pedidos llegan en tiempo real",
              "Podés activar o desactivar platos cuando quieras",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-servido-700" />
                {tip}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !canSave}
              className="h-11 flex-1 rounded-full bg-servido-800 hover:bg-servido-900"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Ir al panel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full">
              <Link href="/dashboard/restaurant">Saltar por ahora</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
