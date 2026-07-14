"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useFoodCart } from "@/contexts/food-cart-context"
import { FoodCartDrawer } from "@/components/restaurants/food-cart-drawer"
import { FollowButton } from "@/components/follows/follow-button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, MapPin, Plus } from "lucide-react"
import type { MenuItem, Restaurant } from "@/types/restaurant"
import { DELIVERY_MODE_LABELS } from "@/types/restaurant"
import { formatPriceNumber } from "@/lib/utils"

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { addItem } = useFoodCart()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const restSnap = await getDoc(doc(db, "restaurants", id))
      if (restSnap.exists()) {
        setRestaurant({ id: restSnap.id, ...restSnap.data() } as Restaurant)
      }
      const menuSnap = await getDocs(
        query(collection(db, "menuItems"), where("restaurantId", "==", id))
      )
      setMenuItems(
        menuSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .filter((m) => m.available !== false)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setLoading(false)
    }
    void load()
  }, [id])

  const categories = [...new Set(menuItems.map((m) => m.category || "General"))]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Restaurante no encontrado</p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/restaurantes">Volver</Link>
        </Button>
      </div>
    )
  }

  const canOrder = restaurant.subscriptionActive === true

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-28">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 px-4 py-8 text-white">
        <div className="container mx-auto">
          <Link
            href="/restaurantes"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Restaurantes
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">{restaurant.name}</h1>
          {restaurant.description && <p className="mt-2 max-w-xl text-orange-50">{restaurant.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-white/20 text-white hover:bg-white/25">
              <MapPin className="mr-1 h-3 w-3" />
              {restaurant.zone || restaurant.address}
            </Badge>
            <Badge className="bg-white/20 text-white hover:bg-white/25">
              {DELIVERY_MODE_LABELS[restaurant.deliveryMode]}
            </Badge>
            {restaurant.deliveryMode !== "retiro_en_local" && (
              <Badge className="bg-white/20 text-white hover:bg-white/25">
                Envío{" "}
                {Number(restaurant.deliveryFee) > 0
                  ? `$${formatPriceNumber(restaurant.deliveryFee || 0)}`
                  : Number(restaurant.deliveryFee) === 0
                    ? "gratis"
                    : "$300"}
              </Badge>
            )}
          </div>
          {restaurant.ownerId && (
            <div className="mt-4">
              <FollowButton
                targetUserId={restaurant.ownerId}
                targetType="restaurant"
                targetName={restaurant.name}
                targetPhotoURL={restaurant.imageUrl}
                restaurantId={restaurant.id}
              />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto space-y-8 px-4 py-6">
        {!canOrder && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="font-semibold">Este local no está recibiendo pedidos ahora</p>
            <p className="mt-1 text-sm text-amber-800">
              El restaurante necesita una suscripción activa en Servido para operar.
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link href="/restaurantes">Ver otros restaurantes</Link>
            </Button>
          </div>
        )}

        {menuItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-100">
            Este restaurante todavía no cargó su menú.
          </div>
        ) : (
          categories.map((category) => (
            <section key={category}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">{category}</h2>
              <div className="space-y-3">
                {menuItems
                  .filter((m) => (m.category || "General") === category)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                        )}
                        <p className="mt-1 font-semibold text-servido-800">${formatPriceNumber(item.price)}</p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 rounded-full bg-servido-800"
                        disabled={!canOrder}
                        onClick={() =>
                          addItem({
                            menuItemId: item.id,
                            restaurantId: restaurant.id,
                            restaurantName: restaurant.name,
                            name: item.name,
                            price: item.price,
                          })
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar
                      </Button>
                    </div>
                  ))}
              </div>
            </section>
          ))
        )}
      </div>

      {canOrder && (
        <FoodCartDrawer
          deliveryMode={restaurant.deliveryMode}
          restaurantDeliveryFee={restaurant.deliveryFee}
          paymentMethods={restaurant.paymentMethods}
          transferInfo={restaurant.transferInfo}
        />
      )}
    </div>
  )
}
