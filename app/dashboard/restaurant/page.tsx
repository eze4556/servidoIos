"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ClipboardList,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Settings,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"
import type { FoodOrder, FoodOrderStatus, MenuItem, Restaurant } from "@/types/restaurant"
import { FOOD_ORDER_STATUS_LABELS } from "@/types/restaurant"
import { formatPriceNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"

type RestaurantTab = "orders" | "menu" | "profile"

const STATUS_FLOW: FoodOrderStatus[] = [
  "recibido",
  "en_preparacion",
  "listo",
  "en_camino",
  "entregado",
]

export default function RestaurantDashboardPage() {
  const { currentUser, handleLogout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RestaurantTab>("orders")
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<FoodOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")
  const [newItemCategory, setNewItemCategory] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [savingMenu, setSavingMenu] = useState(false)

  const restaurantId = currentUser?.restaurantId

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      return
    }

    async function loadData() {
      const restSnap = await getDoc(doc(db, "restaurants", restaurantId))
      if (restSnap.exists()) {
        setRestaurant({ id: restSnap.id, ...restSnap.data() } as Restaurant)
      }

      const menuSnap = await getDocs(query(collection(db, "menuItems"), where("restaurantId", "==", restaurantId)))
      setMenuItems(
        menuSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .sort((a, b) => a.name.localeCompare(b.name))
      )

      try {
        const ordersSnap = await getDocs(
          query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId), orderBy("createdAt", "desc"))
        )
        setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodOrder)))
      } catch {
        const ordersSnap = await getDocs(query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId)))
        setOrders(
          ordersSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
            .sort((a, b) => String(b.id).localeCompare(String(a.id)))
        )
      }

      setLoading(false)
    }

    void loadData()
  }, [restaurantId])

  const handleAddMenuItem = async () => {
    if (!restaurantId || !newItemName.trim() || !newItemPrice) return
    setSavingMenu(true)
    try {
      await addDoc(collection(db, "menuItems"), {
        restaurantId,
        name: newItemName.trim(),
        price: Number(newItemPrice),
        category: newItemCategory.trim() || "General",
        description: newItemDescription.trim(),
        available: true,
        createdAt: serverTimestamp(),
      })
      const menuSnap = await getDocs(query(collection(db, "menuItems"), where("restaurantId", "==", restaurantId)))
      setMenuItems(
        menuSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as MenuItem))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewItemName("")
      setNewItemPrice("")
      setNewItemCategory("")
      setNewItemDescription("")
    } finally {
      setSavingMenu(false)
    }
  }

  const toggleMenuItem = async (item: MenuItem) => {
    await updateDoc(doc(db, "menuItems", item.id), { available: !item.available })
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m))
    )
  }

  const deleteMenuItem = async (itemId: string) => {
    await deleteDoc(doc(db, "menuItems", itemId))
    setMenuItems((prev) => prev.filter((m) => m.id !== itemId))
  }

  const advanceOrderStatus = async (order: FoodOrder) => {
    const currentIndex = STATUS_FLOW.indexOf(order.status)
    if (currentIndex < 0 || currentIndex >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[currentIndex + 1]
    await updateDoc(doc(db, "foodOrders", order.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    })
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  const tabs: { id: RestaurantTab; label: string; icon: typeof ClipboardList }[] = [
    { id: "orders", label: "Pedidos", icon: ClipboardList },
    { id: "menu", label: "Menú", icon: Menu },
    { id: "profile", label: "Perfil", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-servido-gold/20 text-servido-800">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-bold text-gray-900">{restaurant?.name || "Mi restaurante"}</h1>
              <p className="text-xs text-gray-500">Panel de restaurante</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/restaurantes/${restaurantId}`}>Ver tienda</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="container mx-auto flex gap-1 px-4 pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeTab === id
                  ? "bg-servido-800 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {activeTab === "orders" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Pedidos entrantes</h2>
            {orders.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-100">
                Todavía no hay pedidos. Cuando lleguen, los verás acá.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">Pedido #{order.id.slice(-6)}</p>
                      <p className="text-sm text-gray-500">{order.buyerEmail}</p>
                      {order.address && <p className="text-sm text-gray-500">{order.address}</p>}
                    </div>
                    <Badge variant="secondary">{FOOD_ORDER_STATUS_LABELS[order.status]}</Badge>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-gray-700">
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.quantity}x {item.name} — ${formatPriceNumber(item.price * item.quantity)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-bold text-servido-800">${formatPriceNumber(order.total)}</span>
                    {order.status !== "entregado" && order.status !== "cancelado" && (
                      <Button
                        size="sm"
                        className="rounded-full bg-servido-800"
                        onClick={() => void advanceOrderStatus(order)}
                      >
                        Avanzar estado
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "menu" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
              <h2 className="mb-4 font-semibold text-gray-900">Agregar plato</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Precio ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="Ej: Entradas, Principales"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                onClick={() => void handleAddMenuItem()}
                disabled={savingMenu || !newItemName.trim() || !newItemPrice}
                className="mt-4 rounded-full bg-servido-800"
              >
                {savingMenu ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Agregar al menú
              </Button>
            </div>

            <div className="space-y-3">
              {menuItems.length === 0 ? (
                <p className="text-center text-gray-500">Tu menú está vacío. Agregá tu primer plato.</p>
              ) : (
                menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.category} · ${formatPriceNumber(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={item.available} onCheckedChange={() => void toggleMenuItem(item)} />
                      <Button variant="ghost" size="icon" onClick={() => void deleteMenuItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-lg space-y-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100">
            <h2 className="font-semibold text-gray-900">Perfil del restaurante</h2>
            <p className="text-sm text-gray-600">
              <strong>Estado:</strong> {restaurant?.status || "pending"}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Dirección:</strong> {restaurant?.address}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Zona:</strong> {restaurant?.zone || "Sin definir"}
            </p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/dashboard/restaurant/onboarding")}
            >
              Editar perfil
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
