"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, UtensilsCrossed } from "lucide-react"
import type { FoodOrder } from "@/types/restaurant"
import { formatOrderItemSelections } from "@/types/restaurant"
import { usePriceFormat } from "@/hooks/use-price-format"
import { getFoodOrderStatusLabel } from "@/lib/i18n/restaurant-labels"

export default function FoodOrdersPage() {
  const t = useTranslations("foodOrders")
  const { formatPrice } = usePriceFormat()
  const { currentUser, authLoading } = useAuth()
  const [orders, setOrders] = useState<FoodOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      setOrders([])
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const snap = await getDocs(
          query(
            collection(db, "foodOrders"),
            where("buyerId", "==", currentUser!.firebaseUser.uid),
            orderBy("createdAt", "desc")
          )
        )
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodOrder)))
      } catch {
        const snap = await getDocs(
          query(collection(db, "foodOrders"), where("buyerId", "==", currentUser!.firebaseUser.uid))
        )
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodOrder)))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">{t("loginRequired")}</p>
        <Button asChild className="mt-4 rounded-full bg-servido-800">
          <Link href="/login">{t("login")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-gray-100">
            <p className="text-gray-600">{t("empty")}</p>
            <Button asChild className="mt-4 rounded-full bg-servido-800">
              <Link href="/restaurantes">{t("exploreRestaurants")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{order.restaurantName}</p>
                    <p className="text-xs text-gray-500">#{order.id.slice(-8)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{getFoodOrderStatusLabel(t, order.status)}</Badge>
                    <Badge variant="outline">{order.paymentStatus}</Badge>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {order.items.map((item, idx) => {
                    const details = formatOrderItemSelections(item)
                    return (
                      <li key={`${item.menuItemId}-${idx}`}>
                        {item.quantity}x {item.name}
                        {details && (
                          <span className="mt-0.5 block text-xs text-gray-500">{details}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 font-bold text-servido-800">{formatPrice(order.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
