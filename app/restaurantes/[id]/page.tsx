"use client"

import { useEffect, useMemo, useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useFoodCart } from "@/contexts/food-cart-context"
import { FoodCartDrawer } from "@/components/restaurants/food-cart-drawer"
import { FollowButton } from "@/components/follows/follow-button"
import {
  MenuItemDetailDialog,
  type ConfiguredCartAdd,
} from "@/components/restaurants/menu-item-detail-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, MapPin, Plus, UtensilsCrossed } from "lucide-react"
import type { MenuCategory, MenuItem, MenuPromotion, Restaurant } from "@/types/restaurant"
import {
  DELIVERY_MODE_LABELS,
  getMenuItemPrimaryImage,
  getRestaurantCoverUrl,
  getRestaurantLogoUrl,
  menuItemHasOptions,
} from "@/types/restaurant"
import {
  groupMenuItemsByCategory,
  mapMenuCategoryDoc,
  mapMenuItemDoc,
  sortBySortOrderThenName,
} from "@/lib/restaurant-menu"
import { getMenuItemFromPrice, mapMenuPromotionDoc } from "@/lib/restaurant-options"
import { formatPriceNumber } from "@/lib/utils"

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { addItem } = useFoodCart()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [promotions, setPromotions] = useState<MenuPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedPromotion, setSelectedPromotion] = useState<MenuPromotion | null>(null)

  useEffect(() => {
    async function load() {
      const restSnap = await getDoc(doc(db, "restaurants", id))
      if (restSnap.exists()) {
        setRestaurant({ id: restSnap.id, ...restSnap.data() } as Restaurant)
      }

      const [categoriesSnap, menuSnap, promoSnap] = await Promise.all([
        getDocs(query(collection(db, "menuCategories"), where("restaurantId", "==", id))),
        getDocs(query(collection(db, "menuItems"), where("restaurantId", "==", id))),
        getDocs(query(collection(db, "menuPromotions"), where("restaurantId", "==", id))),
      ])

      setCategories(
        sortBySortOrderThenName(
          categoriesSnap.docs.map((d) => mapMenuCategoryDoc(d.id, d.data() as Record<string, unknown>))
        )
      )
      setMenuItems(
        sortBySortOrderThenName(
          menuSnap.docs
            .map((d) => mapMenuItemDoc(d.id, d.data() as Record<string, unknown>))
            .filter((m) => m.available !== false)
        )
      )
      setPromotions(
        promoSnap.docs
          .map((d) => mapMenuPromotionDoc(d.id, d.data() as Record<string, unknown>))
          .filter((p) => p.available !== false)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
      )
      setLoading(false)
    }
    void load()
  }, [id])

  const groups = useMemo(
    () => groupMenuItemsByCategory(categories, menuItems),
    [categories, menuItems]
  )

  const handleConfiguredAdd = (configured: ConfiguredCartAdd) => {
    if (!restaurant) return
    addItem({
      menuItemId: configured.menuItemId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: configured.name,
      price: configured.price,
      selections: configured.selections,
      promotionId: configured.promotionId,
      subtitle: configured.subtitle,
      lineId: configured.lineId,
    })
  }

  const quickAdd = (item: MenuItem) => {
    if (!restaurant) return
    if (menuItemHasOptions(item)) {
      setSelectedPromotion(null)
      setSelectedItem(item)
      return
    }
    addItem({
      menuItemId: item.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: item.name,
      price: item.price,
    })
  }

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
  const coverUrl = getRestaurantCoverUrl(restaurant)
  const logoUrl = getRestaurantLogoUrl(restaurant)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-28">
      <div className="relative overflow-hidden">
        <div className="relative h-44 w-full bg-gradient-to-br from-orange-500 to-red-600 sm:h-56">
          {coverUrl ? (
            <Image src={coverUrl} alt={restaurant.name} fill className="object-cover" unoptimized priority />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/10" />
          <div className="absolute left-4 top-4">
            <Link
              href="/restaurantes"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Restaurantes
            </Link>
          </div>
        </div>

        <div className="container relative mx-auto px-4">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-red-500 ring-4 ring-white shadow-lg">
              {logoUrl ? (
                <Image src={logoUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UtensilsCrossed className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{restaurant.name}</h1>
            </div>
          </div>

          <div className="mt-3 space-y-3 pb-2">
            {restaurant.description && <p className="max-w-xl text-gray-600">{restaurant.description}</p>}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-orange-50 text-orange-800 hover:bg-orange-50">
                <MapPin className="mr-1 h-3 w-3" />
                {restaurant.zone || restaurant.address}
              </Badge>
              <Badge className="bg-orange-50 text-orange-800 hover:bg-orange-50">
                {DELIVERY_MODE_LABELS[restaurant.deliveryMode]}
              </Badge>
              {restaurant.deliveryMode !== "retiro_en_local" && (
                <Badge className="bg-orange-50 text-orange-800 hover:bg-orange-50">
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
              <FollowButton
                targetUserId={restaurant.ownerId}
                targetType="restaurant"
                targetName={restaurant.name}
                targetPhotoURL={logoUrl || undefined}
                restaurantId={restaurant.id}
              />
            )}
          </div>
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

        {promotions.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Combos</h2>
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  role="button"
                  tabIndex={0}
                  className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white p-3 text-left ring-1 ring-orange-100 transition hover:shadow-md"
                  onClick={() => {
                    setSelectedItem(null)
                    setSelectedPromotion(promo)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setSelectedItem(null)
                      setSelectedPromotion(promo)
                    }
                  }}
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white">
                    Combo
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{promo.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                      {promo.includedItems.map((i) => `${i.quantity}x ${i.name}`).join(" · ")}
                    </p>
                    <p className="mt-1 font-semibold text-servido-800">
                      ${formatPriceNumber(promo.comboPrice)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 rounded-full bg-servido-800"
                    disabled={!canOrder}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedItem(null)
                      setSelectedPromotion(promo)
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {menuItems.length === 0 && promotions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-100">
            Este restaurante todavía no cargó su menú.
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.category?.id || "sin-categoria"}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {group.category?.name || "Sin categoría"}
              </h2>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const image = getMenuItemPrimaryImage(item)
                  const hasOptions = menuItemHasOptions(item)
                  const fromPrice = getMenuItemFromPrice(item)
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white p-3 text-left ring-1 ring-gray-100 transition hover:shadow-md"
                      onClick={() => {
                        setSelectedPromotion(null)
                        setSelectedItem(item)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedPromotion(null)
                          setSelectedItem(item)
                        }
                      }}
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {image ? (
                          <Image src={image} alt={item.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                            Sin foto
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
                        )}
                        <p className="mt-1 font-semibold text-servido-800">
                          {hasOptions && fromPrice !== item.price
                            ? `Desde $${formatPriceNumber(fromPrice)}`
                            : `$${formatPriceNumber(item.price)}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 rounded-full bg-servido-800"
                        disabled={!canOrder}
                        onClick={(e) => {
                          e.stopPropagation()
                          quickAdd(item)
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <MenuItemDetailDialog
        item={selectedItem}
        promotion={selectedPromotion}
        open={Boolean(selectedItem || selectedPromotion)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
            setSelectedPromotion(null)
          }
        }}
        canOrder={canOrder}
        onAdd={handleConfiguredAdd}
      />

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
