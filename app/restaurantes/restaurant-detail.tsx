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
import { useTranslations } from "next-intl"
import type { MenuCategory, MenuItem, MenuPromotion, Restaurant } from "@/types/restaurant"
import {
  getMenuItemPrimaryImage,
  getRestaurantCoverUrl,
  getRestaurantLogoUrl,
  menuItemHasOptions,
} from "@/types/restaurant"
import { getDeliveryModeLabel } from "@/lib/i18n/restaurant-labels"
import {
  groupMenuItemsByCategory,
  mapMenuCategoryDoc,
  mapMenuItemDoc,
  sortBySortOrderThenName,
} from "@/lib/restaurant-menu"
import { getMenuItemFromPrice, mapMenuPromotionDoc } from "@/lib/restaurant-options"
import { usePriceFormat } from "@/hooks/use-price-format"

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations("restaurants")
  const { formatPrice, formatPriceNumber } = usePriceFormat()
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
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">{t("notFound")}</p>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/restaurantes">{t("back")}</Link>
        </Button>
      </div>
    )
  }

  const canOrder = restaurant.status === "active" || restaurant.status === "approved"
  const coverUrl = getRestaurantCoverUrl(restaurant)
  const logoUrl = getRestaurantLogoUrl(restaurant)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-28">
      <div className="relative overflow-hidden">
        <div className="relative h-48 w-full bg-gradient-to-br from-servido-800 to-servido-950 sm:h-56 lg:h-72">
          {coverUrl ? (
            <Image src={coverUrl} alt={restaurant.name} fill className="object-cover" unoptimized priority />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-servido-950/70 via-servido-950/25 to-transparent" />
          <div className="absolute left-4 top-4 lg:left-8 lg:top-6">
            <Link
              href="/restaurantes"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToList")}
            </Link>
          </div>
        </div>

        <div className="container relative mx-auto max-w-screen-xl px-4 xl:px-8">
          <div className="-mt-12 flex items-end gap-4 lg:-mt-14 lg:gap-5">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-servido-700 to-servido-950 ring-4 ring-white shadow-lg lg:h-28 lg:w-28">
              {logoUrl ? (
                <Image src={logoUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UtensilsCrossed className="h-10 w-10 text-servido-gold" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-servido-950 sm:text-3xl lg:text-4xl">
                {restaurant.name}
              </h1>
            </div>
          </div>

          <div className="mt-3 space-y-3 pb-2">
            {restaurant.description && (
              <p className="max-w-2xl text-slate-600">{restaurant.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-servido-50 text-servido-800 hover:bg-servido-50">
                <MapPin className="mr-1 h-3 w-3" />
                {restaurant.zone || restaurant.address}
              </Badge>
              <Badge className="rounded-full bg-servido-50 text-servido-800 hover:bg-servido-50">
                {getDeliveryModeLabel(t, restaurant.deliveryMode)}
              </Badge>
              {restaurant.deliveryMode !== "retiro_en_local" && (
                <Badge className="rounded-full bg-servido-50 text-servido-800 hover:bg-servido-50">
                  {t("shippingLabel")} {t("shippingByKm")}
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

      <div className="container mx-auto max-w-screen-xl space-y-8 px-4 py-6 xl:px-8">
        {!canOrder && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 lg:rounded-3xl">
            <p className="font-semibold">{t("closedTitle")}</p>
            <p className="mt-1 text-sm text-amber-800">{t("closedBody")}</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link href="/restaurantes">{t("seeOthers")}</Link>
            </Button>
          </div>
        )}

        {promotions.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-servido-950 lg:text-xl">
              {t("combos")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  role="button"
                  tabIndex={0}
                  className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white p-3 text-left shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl lg:p-4"
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
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-servido-700 to-servido-950 text-xs font-bold text-servido-gold lg:h-24 lg:w-24">
                    {promo.imageUrl ? (
                      <Image
                        src={promo.imageUrl}
                        alt={promo.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      t("combo")
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-servido-950">{promo.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                      {promo.includedItems.map((i) => `${i.quantity}x ${i.name}`).join(" · ")}
                    </p>
                    <p className="mt-1 font-semibold text-servido-800">
                      {formatPrice(promo.comboPrice)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                    disabled={!canOrder}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedItem(null)
                      setSelectedPromotion(promo)
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {t("add")}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {menuItems.length === 0 && promotions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-servido-950/5 lg:rounded-3xl">
            {t("emptyMenu")}
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.category?.id || "sin-categoria"}>
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-servido-950 lg:text-xl">
                {group.category?.name || t("noCategory")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
                {group.items.map((item) => {
                  const image = getMenuItemPrimaryImage(item)
                  const hasOptions = menuItemHasOptions(item)
                  const fromPrice = getMenuItemFromPrice(item)
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white p-3 text-left shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl lg:p-4"
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
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 lg:h-24 lg:w-24">
                        {image ? (
                          <Image src={image} alt={item.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                            {t("noPhoto")}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-servido-950">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                        )}
                        <p className="mt-1 font-semibold text-servido-800">
                          {hasOptions && fromPrice !== item.price
                            ? t("fromPrice", { price: formatPrice(fromPrice) })
                            : formatPrice(item.price)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                        disabled={!canOrder}
                        onClick={(e) => {
                          e.stopPropagation()
                          quickAdd(item)
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {t("add")}
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
          restaurantCoordinates={restaurant.coordinates || null}
          paymentMethods={restaurant.paymentMethods}
        />
      )}
    </div>
  )
}
