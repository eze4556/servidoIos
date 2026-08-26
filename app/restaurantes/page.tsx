"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { RestaurantCard } from "@/components/restaurants/restaurant-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Restaurant } from "@/types/restaurant"

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
        ...(meta?.categories || []),
        ...(meta?.itemNames || []),
      ]
        .join(" ")
        .toLocaleLowerCase("es")

      if (normalizedSearch && !searchable.includes(normalizedSearch)) return false
      if (
        selectedCategory &&
        !meta?.categories.some(
          (category) =>
            category.toLocaleLowerCase("es") === selectedCategory.toLocaleLowerCase("es")
        )
      ) {
        return false
      }
      if (hasPriceLimit && (meta?.minPrice === null || meta?.minPrice === undefined || meta.minPrice > priceLimit)) {
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
  }, [restaurants, menuMeta, search, selectedCategory, maxPrice, sortBy])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-servido-950/5 sm:rounded-3xl lg:mb-8 lg:rounded-[1.75rem] lg:shadow-[0_24px_60px_-28px_rgba(46,16,101,0.28)]">
          <div className="relative">
            <Image
              src="/images/bannerrestaurante.jpg"
              alt={t("bannerAlt")}
              width={1600}
              height={759}
              className="h-auto w-full"
              sizes="(max-width: 1280px) calc(100vw - 2rem), 1200px"
              priority
              unoptimized
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-servido-950/40 to-transparent lg:block" />
            <div className="pointer-events-none absolute bottom-5 left-6 hidden lg:block">
              <p className="font-serif text-3xl font-semibold tracking-tight text-white drop-shadow">
                Servido
                <span className="text-servido-gold">.</span>
              </p>
              <p className="mt-1 text-sm text-white/85">{t("catalogHeroSubtitle")}</p>
            </div>
          </div>
        </section>

        <div className="mb-6 space-y-3 rounded-2xl bg-white p-4 shadow-[0_16px_40px_-28px_rgba(46,16,101,0.3)] ring-1 ring-servido-950/5 lg:rounded-3xl lg:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 rounded-2xl border-0 bg-slate-100/90 pl-10 ring-1 ring-servido-950/5 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-servido-800/25"
            />
          </div>

          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              <button
                key="all"
                type="button"
                onClick={() => setSelectedCategory("")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === ""
                    ? "bg-servido-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-servido-50"
                }`}
              >
                {t("allCategories")}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === category
                      ? "bg-servido-950 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-servido-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-2 sm:flex sm:items-center">
            <label className="relative">
              <span className="sr-only">{t("sortAria")}</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as RestaurantSort)}
                className="h-10 w-full appearance-none rounded-2xl border-0 bg-slate-100/90 pl-9 pr-3 text-sm text-slate-700 ring-1 ring-servido-950/5"
              >
                <option value="recommended">{t("sortRecommended")}</option>
                <option value="price-asc">{t("sortPriceAsc")}</option>
                <option value="delivery-asc">{t("sortDeliveryAsc")}</option>
              </select>
            </label>
            <div className="relative sm:w-44">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <Input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder={t("maxPricePlaceholder")}
                className="h-10 rounded-2xl border-0 bg-slate-100/90 pl-7 text-sm ring-1 ring-servido-950/5"
              />
            </div>
          </div>
        </div>

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
              <Link href="/signup/restaurante">{t("registerRestaurant")}</Link>
            </Button>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-servido-950/5">
            <p className="font-medium text-servido-950">{t("noResultsTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("noResultsBody")}</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-servido-200"
              onClick={() => {
                setSearch("")
                setSelectedCategory("")
                setMaxPrice("")
                setSortBy("recommended")
              }}
            >
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
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
      </div>
    </div>
  )
}
