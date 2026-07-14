"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { RestaurantCard } from "@/components/restaurants/restaurant-card"
import { Button } from "@/components/ui/button"
import { Loader2, UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"

function isRestaurantOperative(restaurant: Restaurant) {
  // Nuevos: subscriptionActive === true. Legacy sin campo: no aparecen hasta suscribirse.
  return restaurant.subscriptionActive === true && (restaurant.status === "active" || restaurant.status === "approved")
}

export default function RestaurantesPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const snap = await getDocs(
          query(
            collection(db, "restaurants"),
            where("subscriptionActive", "==", true),
            where("status", "in", ["active", "approved"]),
            orderBy("name")
          )
        )
        setRestaurants(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Restaurant)))
      } catch {
        const snap = await getDocs(collection(db, "restaurants"))
        setRestaurants(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Restaurant))
            .filter(isRestaurantOperative)
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      } finally {
        setLoading(false)
      }
    }
    void loadRestaurants()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white">
              <UtensilsCrossed className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Restaurantes</h1>
              <p className="text-sm text-gray-600">Pedí comida de los mejores locales de tu zona</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-gray-100">
            <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-orange-400" />
            <h2 className="text-lg font-semibold text-gray-900">Próximamente más restaurantes</h2>
            <p className="mt-2 text-sm text-gray-600">
              Estamos sumando locales a la plataforma. ¿Tenés un restaurante?
            </p>
            <Button asChild className="mt-6 rounded-full bg-servido-800">
              <Link href="/signup/restaurante">Registrar mi restaurante</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
