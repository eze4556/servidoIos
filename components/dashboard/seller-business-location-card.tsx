"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getBusinessLocation, saveBusinessLocation } from "@/lib/business-location"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import { BusinessLocationPicker } from "@/components/location/business-location-picker"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function SellerBusinessLocationCard() {
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [location, setLocation] = useState<BusinessLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!currentUser?.firebaseUser.uid) {
      setLoading(false)
      return
    }
    let cancelled = false
    void getBusinessLocation(currentUser.firebaseUser.uid).then((loc) => {
      if (!cancelled) {
        setLocation(loc)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [currentUser?.firebaseUser.uid])

  const handleSave = async () => {
    if (!currentUser?.firebaseUser.uid || !location) return
    if (!hasValidCoordinates(location.latitude, location.longitude)) {
      toast({
        title: "Elegí una ubicación de la lista",
        description: "Buscá tu ciudad o barrio y tocá un resultado.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      await saveBusinessLocation(currentUser.firebaseUser.uid, location, {
        restaurantId:
          currentUser.businessType === "restaurant"
            ? currentUser.restaurantId || currentUser.firebaseUser.uid
            : null,
      })
      toast({ title: "Ubicación del local guardada" })
    } catch (error) {
      console.error(error)
      toast({
        title: "No se pudo guardar",
        description: "Probá de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando ubicación…
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/30 p-4">
      <BusinessLocationPicker
        value={location}
        onChange={setLocation}
        label="Ubicación de tu local"
        helperText="Una sola vez. Tus historias se muestran a gente cerca (aprox. 50 km)."
      />
      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || !location}
        className="rounded-full bg-servido-800 hover:bg-servido-900"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          "Guardar ubicación"
        )}
      </Button>
    </div>
  )
}
