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
import type { Restaurant } from "@/types/restaurant"

type RestaurantMenuMeta = {
  categories: string[]
  itemNames: string[]
  minPrice: number | null
}

type RestaurantSort = "recommended" | "price-asc" | "delivery-asc"

function isRestaurantOperative(restaurant: Restaurant) {
  // Nuevos: subscriptionActive === true. Legacy sin campo: no aparecen hasta suscribirse.
  return restaurant.subscriptionActive === true && (restaurant.status === "active" || restaurant.status === "approved")
}

export default function RestaurantesPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [menuMeta, setMenuMeta] = useState<Record<string, RestaurantMenuMeta>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todas")
  const [maxPrice, setMaxPrice] = useState("")
  const [sortBy, setSortBy] = useState<RestaurantSort>("recommended")

  useEffect(() => {
    async function loadRestaurants() {
      let loadedRestaurants: Restaurant[] = []
      try {
        const snap = await getDocs(
          query(
            collection(db, "restaurants"),
            where("subscriptionActive", "==", true),
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
    return [
      "Todas",
      ...Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
        .map(([category]) => category),
    ]
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
        selectedCategory !== "Todas" &&
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="border-b border-gray-100 bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="mx-auto max-w-[1014px] overflow-hidden rounded-2xl shadow-md">
            <Image
              src="/images/bannerestaurante.jfif"
              alt="Los mejores sabores, directo a tu mesa"
              width={1600}
              height={759}
              className="h-auto w-full"
              sizes="(max-width: 1046px) calc(100vw - 2rem), 1014px"
              priority
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5">
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar restaurante o comida"
              className="h-11 rounded-xl bg-white pl-10 shadow-sm"
            />
          </div>

          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === category
                      ? "bg-servido-800 text-white shadow-sm"
                      : "bg-white text-gray-700 ring-1 ring-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-2 sm:flex sm:items-center">
            <label className="relative">
              <span className="sr-only">Ordenar restaurantes</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as RestaurantSort)}
                className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 shadow-sm"
              >
                <option value="recommended">Recomendados</option>
                <option value="price-asc">Menor precio</option>
                <option value="delivery-asc">Menor envío</option>
              </select>
            </label>
            <div className="relative sm:w-44">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <Input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Precio máximo"
                className="h-10 rounded-xl bg-white pl-7 text-sm shadow-sm"
              />
            </div>
          </div>
        </div>

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
        ) : filteredRestaurants.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-gray-100">
            <p className="font-medium text-gray-900">No encontramos restaurantes</p>
            <p className="mt-1 text-sm text-gray-500">Probá otra comida o cambiá el precio.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => {
                setSearch("")
                setSelectedCategory("Todas")
                setMaxPrice("")
                setSortBy("recommended")
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
