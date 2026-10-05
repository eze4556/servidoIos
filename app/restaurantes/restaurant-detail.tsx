"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { Loader2, ArrowLeft, Bike, MapPin, Plus, UtensilsCrossed } from "lucide-react"
import { useTranslations } from "next-intl"
import type { MenuCategory, MenuItem, MenuPromotion, Restaurant } from "@/types/restaurant"
import {
  FOOD_BUSINESS_KINDS,
  getMenuItemPrimaryImage,
  getRestaurantCoverUrl,
  getRestaurantLogoUrl,
  menuItemHasOptions,
  type FoodBusinessKind,
} from "@/types/restaurant"
import { getDeliveryModeLabel, getFoodBusinessKindLabel } from "@/lib/i18n/restaurant-labels"
import {
  groupMenuItemsByCategory,
  mapMenuCategoryDoc,
  mapMenuItemDoc,
  sortBySortOrderThenName,
} from "@/lib/restaurant-menu"
import { getMenuItemFromPrice, mapMenuPromotionDoc } from "@/lib/restaurant-options"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useRouteId } from "@/hooks/use-route-id"
import { cn } from "@/lib/utils"

export function RestaurantDetail() {
  const id = useRouteId() ?? ""
  const t = useTranslations("restaurants")
  const { formatPrice } = usePriceFormat()
  const { addItem } = useFoodCart()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [promotions, setPromotions] = useState<MenuPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedPromotion, setSelectedPromotion] = useState<MenuPromotion | null>(null)
  const [activeSection, setActiveSection] = useState<string>("")
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

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

  const navSections = useMemo(() => {
    const sections: { id: string; label: string }[] = []
    if (promotions.length > 0) {
      sections.push({ id: "combos", label: t("combos") })
    }
    for (const group of groups) {
      sections.push({
        id: group.category?.id || "sin-categoria",
        label: group.category?.name || t("noCategory"),
      })
    }
    return sections
  }, [groups, promotions.length, t])

  useEffect(() => {
    if (navSections.length === 0) return
    setActiveSection((prev) => prev || navSections[0].id)
  }, [navSections])

  useEffect(() => {
    if (navSections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id.replace(/^menu-section-/, ""))
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] }
    )

    for (const section of navSections) {
      const el = sectionRefs.current[section.id]
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [navSections, menuItems.length, promotions.length])

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const el = sectionRefs.current[sectionId]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 120
    window.scrollTo({ top, behavior: "smooth" })
  }

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
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4f8]">
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
  const kind =
    restaurant.foodBusinessKind &&
    FOOD_BUSINESS_KINDS.includes(restaurant.foodBusinessKind as FoodBusinessKind)
      ? (restaurant.foodBusinessKind as FoodBusinessKind)
      : null

  return (
    <div className="min-h-screen bg-[#f6f4f8] pb-28">
      <div className="relative">
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-servido-800 to-servido-950 sm:h-56 lg:h-64">
          {coverUrl ? (
            <Image src={coverUrl} alt={restaurant.name} fill className="object-cover" unoptimized priority />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-servido-950/75 via-servido-950/25 to-transparent" />
          <div className="absolute left-4 top-4 lg:left-8 lg:top-6">
            <Link
              href="/restaurantes"
              className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-black/50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToList")}
            </Link>
          </div>
        </div>

        <div className="container relative mx-auto max-w-screen-xl px-4 xl:px-8">
          <div className="-mt-10 rounded-3xl bg-white p-4 shadow-[0_18px_40px_-24px_rgba(46,16,101,0.35)] ring-1 ring-servido-950/8 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-servido-700 to-servido-950 shadow-md ring-2 ring-white sm:h-24 sm:w-24">
                {logoUrl ? (
                  <Image src={logoUrl} alt={restaurant.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UtensilsCrossed className="h-9 w-9 text-servido-gold" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-servido-950 sm:text-2xl lg:text-3xl">
                    {restaurant.name}
                  </h1>
                  {kind && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-800">
                      {getFoodBusinessKindLabel(t, kind)}
                    </span>
                  )}
                </div>
                {restaurant.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{restaurant.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
                    <MapPin className="h-3.5 w-3.5 text-servido-800" />
                    {restaurant.zone || restaurant.address}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
                    <Bike className="h-3.5 w-3.5 text-servido-800" />
                    {getDeliveryModeLabel(t, restaurant.deliveryMode)}
                  </span>
                  {restaurant.deliveryMode !== "retiro_en_local" && (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
                      {t("shippingLabel")} {t("shippingByKm")}
                    </span>
                  )}
                </div>
                {restaurant.ownerId && (
                  <div className="mt-3">
                    <FollowButton
                      targetUserId={restaurant.ownerId}
                      targetType="restaurant"
                      targetName={restaurant.name}
                      targetPhotoURL={logoUrl || undefined}
                      restaurantId={restaurant.id}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {navSections.length > 0 && (
        <div className="sticky top-0 z-20 mt-4 border-b border-servido-950/5 bg-[#f6f4f8]/95 backdrop-blur-md">
          <div className="container mx-auto max-w-screen-xl px-4 xl:px-8">
            <div className="overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2">
                {navSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                      activeSection === section.id
                        ? "bg-servido-950 text-white shadow-sm"
                        : "bg-white text-slate-700 ring-1 ring-servido-950/8 hover:bg-servido-50"
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-screen-xl space-y-8 px-4 py-6 xl:px-8">
        {!canOrder && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="font-semibold">{t("closedTitle")}</p>
            <p className="mt-1 text-sm text-amber-800">{t("closedBody")}</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link href="/restaurantes">{t("seeOthers")}</Link>
            </Button>
          </div>
        )}

        {promotions.length > 0 && (
          <section
            id="menu-section-combos"
            ref={(el) => {
              sectionRefs.current.combos = el
            }}
          >
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-servido-950 lg:text-xl">
              {t("combos")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  role="button"
                  tabIndex={0}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-servido-950/8 transition hover:-translate-y-0.5 hover:shadow-md"
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
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-servido-700 to-servido-950 text-xs font-bold text-servido-gold">
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
                    <p className="font-semibold text-servido-950">{promo.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                      {promo.includedItems.map((i) => `${i.quantity}x ${i.name}`).join(" · ")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-servido-900">
                      {formatPrice(promo.comboPrice)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                    disabled={!canOrder}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedItem(null)
                      setSelectedPromotion(promo)
                    }}
                    aria-label={t("add")}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {menuItems.length === 0 && promotions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-servido-950/5">
            {t("emptyMenu")}
          </div>
        ) : (
          groups.map((group) => {
            const sectionId = group.category?.id || "sin-categoria"
            return (
              <section
                key={sectionId}
                id={`menu-section-${sectionId}`}
                ref={(el) => {
                  sectionRefs.current[sectionId] = el
                }}
              >
                <h2 className="mb-4 text-lg font-semibold tracking-tight text-servido-950 lg:text-xl">
                  {group.category?.name || t("noCategory")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const image = getMenuItemPrimaryImage(item)
                    const hasOptions = menuItemHasOptions(item)
                    const fromPrice = getMenuItemFromPrice(item)
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-servido-950/8 transition hover:-translate-y-0.5 hover:shadow-md"
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
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                          {image ? (
                            <Image
                              src={image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                              {t("noPhoto")}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-servido-950">{item.name}</p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                              {item.description}
                            </p>
                          )}
                          <p className="mt-2 text-sm font-semibold text-servido-900">
                            {hasOptions && fromPrice !== item.price
                              ? t("fromPrice", { price: formatPrice(fromPrice) })
                              : formatPrice(item.price)}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
                          disabled={!canOrder}
                          onClick={(e) => {
                            e.stopPropagation()
                            quickAdd(item)
                          }}
                          aria-label={t("add")}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
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
