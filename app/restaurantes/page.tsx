"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { RestaurantCard } from "@/components/restaurants/restaurant-card"
import { FoodBusinessKindRail } from "@/components/restaurants/food-business-kind-rail"
import { BecomeCadeteCta } from "@/components/cadete/become-cadete-cta"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, SlidersHorizontal, UtensilsCrossed, X } from "lucide-react"
import { useTranslations } from "next-intl"
import type { FoodBusinessKind, Restaurant } from "@/types/restaurant"
import { cn } from "@/lib/utils"

type RestaurantMenuMeta = {
  categories: string[]
  itemNames: string[]
  minPrice: number | null
}

type RestaurantSort = "recommended" | "price-asc" | "delivery-asc"

function isRestaurantOperative(restaurant: Restaurant) {
  return restaurant.status === "active" || restaurant.status === "approved"
}

export default function RestaurantesPage() {
  const t = useTranslations("restaurants")
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [menuMeta, setMenuMeta] = useState<Record<string, RestaurantMenuMeta>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedBusinessKind, setSelectedBusinessKind] = useState<FoodBusinessKind | "">("")
  const [maxPrice, setMaxPrice] = useState("")
  const [sortBy, setSortBy] = useState<RestaurantSort>("recommended")

  useEffect(() => {
    async function loadRestaurants() {
      let loadedRestaurants: Restaurant[] = []
      try {
        const snap = await getDocs(
          query(
            collection(db, "restaurants"),
            where("status", "in", ["active", "approved"]),
            orderBy("name")
          )
        )
        loadedRestaurants = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Restaurant))
      } catch {
        const snap = await getDocs(collection(db, "restaurants"))
        loadedRestaurants = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Restaurant))
          .filter(isRestaurantOperative)
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      setRestaurants(loadedRestaurants)

      try {
        const [categorySnap, itemSnap] = await Promise.all([
          getDocs(collection(db, "menuCategories")),
          getDocs(collection(db, "menuItems")),
        ])
        const operativeIds = new Set(loadedRestaurants.map((restaurant) => restaurant.id))
        const nextMeta: Record<string, RestaurantMenuMeta> = {}

        for (const restaurant of loadedRestaurants) {
          nextMeta[restaurant.id] = { categories: [], itemNames: [], minPrice: null }
        }

        for (const categoryDoc of categorySnap.docs) {
          const data = categoryDoc.data()
          const restaurantId = String(data.restaurantId || "")
          const name = String(data.name || "").trim()
          if (!operativeIds.has(restaurantId) || !name) continue
          if (!nextMeta[restaurantId].categories.includes(name)) {
            nextMeta[restaurantId].categories.push(name)
          }
        }

        for (const itemDoc of itemSnap.docs) {
          const data = itemDoc.data()
          const restaurantId = String(data.restaurantId || "")
          if (!operativeIds.has(restaurantId) || data.available === false) continue
          const name = String(data.name || "").trim()
          const legacyCategory = String(data.category || "").trim()
          const price = Number(data.price)
          if (name) nextMeta[restaurantId].itemNames.push(name)
          if (
            legacyCategory &&
            !nextMeta[restaurantId].categories.includes(legacyCategory)
          ) {
            nextMeta[restaurantId].categories.push(legacyCategory)
          }
          if (Number.isFinite(price) && price >= 0) {
            const current = nextMeta[restaurantId].minPrice
            nextMeta[restaurantId].minPrice =
              current === null ? price : Math.min(current, price)
          }
        }

        setMenuMeta(nextMeta)
      } catch {
        setMenuMeta({})
      } finally {
        setLoading(false)
      }
    }
    void loadRestaurants()
  }, [])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    Object.values(menuMeta).forEach((meta) => {
      meta.categories.forEach((category) => {
        counts.set(category, (counts.get(category) || 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .map(([category]) => category)
  }, [menuMeta])

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es")
    const priceLimit = Number(maxPrice)
    const hasPriceLimit = maxPrice !== "" && Number.isFinite(priceLimit) && priceLimit >= 0

    const filtered = restaurants.filter((restaurant) => {
      const meta = menuMeta[restaurant.id]
      const searchable = [
        restaurant.name,
        restaurant.description || "",
        restaurant.foodBusinessKind || "",
        ...(meta?.categories || []),
        ...(meta?.itemNames || []),
      ]
        .join(" ")
        .toLocaleLowerCase("es")

      if (normalizedSearch && !searchable.includes(normalizedSearch)) return false
      if (selectedBusinessKind && restaurant.foodBusinessKind !== selectedBusinessKind) {
        return false
      }
      if (
        selectedCategory &&
        !meta?.categories.some(
          (category) =>
            category.toLocaleLowerCase("es") === selectedCategory.toLocaleLowerCase("es")
        )
      ) {
        return false
      }
      if (
        hasPriceLimit &&
        (meta?.minPrice === null || meta?.minPrice === undefined || meta.minPrice > priceLimit)
      ) {
        return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === "price-asc") {
        return (
          (menuMeta[a.id]?.minPrice ?? Number.MAX_SAFE_INTEGER) -
          (menuMeta[b.id]?.minPrice ?? Number.MAX_SAFE_INTEGER)
        )
      }
      if (sortBy === "delivery-asc") {
        return (Number(a.deliveryFee) || 0) - (Number(b.deliveryFee) || 0)
      }
      return a.name.localeCompare(b.name, "es")
    })
  }, [restaurants, menuMeta, search, selectedCategory, selectedBusinessKind, maxPrice, sortBy])

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(selectedCategory) ||
    Boolean(selectedBusinessKind) ||
    Boolean(maxPrice) ||
    sortBy !== "recommended"

  const clearFilters = () => {
    setSearch("")
    setSelectedCategory("")
    setSelectedBusinessKind("")
    setMaxPrice("")
    setSortBy("recommended")
  }

  return (
    <div className="min-h-screen bg-[#f6f4f8] pb-24">
      <div className="relative overflow-hidden bg-servido-950">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <Image
            src="/images/bannerrestaurante.jpg"
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-servido-950/70 via-servido-950/85 to-servido-950" />
        </div>
        <div className="container relative mx-auto px-4 pb-5 pt-6 md:px-6 md:pb-6 md:pt-8">
          <p className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Servido
            <span className="text-servido-gold">.</span>
          </p>
          <p className="mt-1 max-w-xl text-sm text-white/80 sm:text-base">{t("catalogHeroSubtitle")}</p>
        </div>
      </div>

      <div className="sticky top-0 z-30 border-b border-servido-950/5 bg-[#f6f4f8]/95 backdrop-blur-md">
        <div className="container mx-auto space-y-3 px-4 py-3 md:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-12 rounded-2xl border-0 bg-white pl-10 pr-10 text-sm shadow-sm ring-1 ring-servido-950/8 focus-visible:ring-2 focus-visible:ring-servido-800/25"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("clearSearch")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-6 px-4 py-5 md:px-6 md:py-7">
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-servido-950">{t("browseByType")}</h2>
            <p className="text-xs text-slate-500">{t("browseByTypeHint")}</p>
          </div>
          <FoodBusinessKindRail
            selected={selectedBusinessKind}
            onSelect={setSelectedBusinessKind}
          />
        </section>

        {categories.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-servido-950">{t("browseByCategory")}</h2>
              <p className="text-xs text-slate-500">{t("browseByCategoryHint")}</p>
            </div>
            <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                    selectedCategory === ""
                      ? "bg-servido-950 text-white shadow-sm"
                      : "bg-white text-slate-700 ring-1 ring-servido-950/8 hover:bg-servido-50"
                  )}
                >
                  {t("allCategories")}
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setSelectedCategory((prev) => (prev === category ? "" : category))
                    }
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                      selectedCategory === category
                        ? "bg-servido-950 text-white shadow-sm"
                        : "bg-white text-slate-700 ring-1 ring-servido-950/8 hover:bg-servido-50"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-servido-950">
              {t("placesNearby")}
            </h2>
            {!loading && (
              <p className="text-sm text-slate-500">
                {t("placesCount", { count: filteredRestaurants.length })}
              </p>
            )}
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:items-center">
            <label className="relative min-w-0 sm:w-44">
              <span className="sr-only">{t("sortAria")}</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as RestaurantSort)}
                className="h-10 w-full appearance-none rounded-2xl border-0 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm ring-1 ring-servido-950/8"
              >
                <option value="recommended">{t("sortRecommended")}</option>
                <option value="price-asc">{t("sortPriceAsc")}</option>
                <option value="delivery-asc">{t("sortDeliveryAsc")}</option>
              </select>
            </label>
            <div className="relative min-w-0 sm:w-36">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <Input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder={t("maxPricePlaceholder")}
                className="h-10 rounded-2xl border-0 bg-white pl-7 text-sm shadow-sm ring-1 ring-servido-950/8"
              />
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                className="h-10 rounded-full px-3 text-servido-800 hover:bg-white"
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-servido-950/5">
            <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-servido-gold" />
            <h2 className="text-lg font-semibold text-servido-950">{t("emptySoonTitle")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("emptySoonBody")}</p>
            <Button asChild className="mt-6 rounded-full bg-servido-950 text-white hover:bg-servido-800">
              <Link href="/dashboard/buyer?tab=openStore">{t("registerRestaurant")}</Link>
            </Button>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-servido-950/5">
            <p className="font-medium text-servido-950">{t("noResultsTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("noResultsBody")}</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-servido-200"
              onClick={clearFilters}
            >
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                categories={menuMeta[restaurant.id]?.categories}
                minPrice={menuMeta[restaurant.id]?.minPrice}
              />
            ))}
          </div>
        )}

        <div className="mt-10">
          <BecomeCadeteCta variant="banner" />
        </div>
      </div>
    </div>
  )
}
