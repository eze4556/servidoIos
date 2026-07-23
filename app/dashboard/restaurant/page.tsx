"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { ApiService } from "@/lib/services/api"
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
  Settings,
  UtensilsCrossed,
} from "lucide-react"
import type {
  FoodOrder,
  FoodOrderStatus,
  Restaurant,
  RestaurantPaymentMethod,
} from "@/types/restaurant"
import { RestaurantBrandingForm } from "@/components/restaurants/menu-admin/restaurant-branding-form"
import { MenuAdminPanel } from "@/components/restaurants/menu-admin/menu-admin-panel"
import {
  DELIVERY_MODE_LABELS,
  FOOD_ORDER_STATUS_LABELS,
  RESTAURANT_PAYMENT_METHOD_LABELS,
} from "@/types/restaurant"
import { formatPriceNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { notifyFoodOrderStatus } from "@/lib/notifications"

type RestaurantTab = "orders" | "menu" | "profile"

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pago pendiente",
  approved: "Pago aprobado",
  rejected: "Pago rechazado",
  cancelled: "Pago cancelado",
}

function getNextRestaurantStatus(order: FoodOrder): FoodOrderStatus | null {
  if (order.status === "entregado" || order.status === "cancelado") return null

  // Delivery: restaurant advances until listo; cadete claim moves to en_camino
  if (order.deliveryMode !== "retiro_en_local") {
    if (order.status === "recibido") return "en_preparacion"
    if (order.status === "en_preparacion") return "listo"
    if (order.status === "listo" || order.status === "en_camino") return null
    return null
  }

  // Pickup: skip en_camino
  if (order.status === "recibido") return "en_preparacion"
  if (order.status === "en_preparacion") return "listo"
  if (order.status === "listo") return "entregado"
  return null
}

export default function RestaurantDashboardPage() {
  const { currentUser, handleLogout, refreshUserProfile } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RestaurantTab>("orders")
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<FoodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showOtherPayments, setShowOtherPayments] = useState(false)

  const [paymentMethods, setPaymentMethods] = useState<RestaurantPaymentMethod[]>(["cash", "transfer"])
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("300")
  const [transferAlias, setTransferAlias] = useState("")
  const [transferCbu, setTransferCbu] = useState("")
  const [transferBank, setTransferBank] = useState("")
  const [transferHolder, setTransferHolder] = useState("")
  const [transferInstructions, setTransferInstructions] = useState("")
  const [savingPayments, setSavingPayments] = useState(false)
  const [connectingMp, setConnectingMp] = useState(false)
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [cancellingSubscription, setCancellingSubscription] = useState(false)

  const restaurantId = currentUser?.restaurantId
  const mpConnected = currentUser?.mercadoPagoStatus === "connected"
  const hasActiveSubscription = currentUser?.subscriptionStatus === "active"
  const cancelAtPeriodEnd = Boolean(currentUser?.subscriptionCancelAtPeriodEnd)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const flag = params.get("mercadopago")
    const sub = params.get("subscription")
    if (flag === "connected") {
      setPaymentMsg("Mercado Pago conectado correctamente.")
      setActiveTab("profile")
      void refreshUserProfile()
      window.history.replaceState({}, "", "/dashboard/restaurant")
    } else if (flag === "error") {
      setPaymentMsg("No se pudo conectar Mercado Pago. Intentá de nuevo.")
      setActiveTab("profile")
      window.history.replaceState({}, "", "/dashboard/restaurant")
    } else if (sub === "success") {
      setPaymentMsg("¡Suscripción activada! Ya podés operar tu restaurante.")
      void refreshUserProfile()
      window.history.replaceState({}, "", "/dashboard/restaurant")
    } else if (sub === "failure") {
      setPaymentMsg("No se pudo activar la suscripción. Intentá de nuevo.")
      window.history.replaceState({}, "", "/dashboard/restaurant")
    }
  }, [refreshUserProfile])

  // Si ya tiene suscripción activa pero el flag del local no, sincronizar
  useEffect(() => {
    if (!restaurantId || !hasActiveSubscription) return
    if (restaurant?.subscriptionActive === true) return
    void updateDoc(doc(db, "restaurants", restaurantId), {
      subscriptionActive: true,
      updatedAt: serverTimestamp(),
    }).then(() => {
      setRestaurant((prev) => (prev ? { ...prev, subscriptionActive: true } : prev))
    })
  }, [restaurantId, hasActiveSubscription, restaurant?.subscriptionActive])

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    async function loadStatic() {
      const restSnap = await getDoc(doc(db, "restaurants", restaurantId!))
      if (!cancelled && restSnap.exists()) {
        const data = { id: restSnap.id, ...restSnap.data() } as Restaurant
        setRestaurant(data)
        const methods = data.paymentMethods?.length
          ? data.paymentMethods
          : (["cash", "transfer"] as RestaurantPaymentMethod[])
        setPaymentMethods(methods)
        const fee = Number(data.deliveryFee)
        setDeliveryFeeInput(Number.isFinite(fee) && fee >= 0 ? String(fee) : "300")
        setTransferAlias(data.transferInfo?.alias || "")
        setTransferCbu(data.transferInfo?.cbu || "")
        setTransferBank(data.transferInfo?.bankName || "")
        setTransferHolder(data.transferInfo?.holderName || "")
        setTransferInstructions(data.transferInfo?.instructions || "")
      }

    }

    void loadStatic()

    const ordersQuery = query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId))

    try {
      unsubscribe = onSnapshot(
        ordersQuery,
        (snap) => {
          const next = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
            .sort((a, b) => String(b.id).localeCompare(String(a.id)))
          setOrders(next)
          setLoading(false)
        },
        async () => {
          // Fallback one-shot if listener fails (e.g. rules)
          try {
            const ordersSnap = await getDocs(
              query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId), orderBy("createdAt", "desc"))
            )
            if (!cancelled) {
              setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodOrder)))
            }
          } catch {
            const ordersSnap = await getDocs(
              query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId))
            )
            if (!cancelled) {
              setOrders(
                ordersSnap.docs
                  .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
                  .sort((a, b) => String(b.id).localeCompare(String(a.id)))
              )
            }
          } finally {
            if (!cancelled) setLoading(false)
          }
        }
      )
    } catch {
      void (async () => {
        const ordersSnap = await getDocs(query(collection(db, "foodOrders"), where("restaurantId", "==", restaurantId)))
        if (!cancelled) {
          setOrders(
            ordersSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as FoodOrder))
              .sort((a, b) => String(b.id).localeCompare(String(a.id)))
          )
          setLoading(false)
        }
      })()
    }

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [restaurantId])

  const advanceOrderStatus = async (order: FoodOrder) => {
    if (!hasActiveSubscription) {
      setPaymentMsg("Necesitás una suscripción activa para operar.")
      return
    }
    const nextStatus = getNextRestaurantStatus(order)
    if (!nextStatus) return
    await updateDoc(doc(db, "foodOrders", order.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    })
    void notifyFoodOrderStatus({
      buyerId: order.buyerId,
      orderId: order.id,
      status: nextStatus,
      restaurantName: order.restaurantName,
    })
  }

  const confirmOrderPayment = async (order: FoodOrder) => {
    if (!hasActiveSubscription) {
      setPaymentMsg("Necesitás una suscripción activa para operar.")
      return
    }
    await updateDoc(doc(db, "foodOrders", order.id), {
      paymentStatus: "approved",
      updatedAt: serverTimestamp(),
    })
  }

  const handleSubscribe = async () => {
    if (!currentUser) return
    setSubscribing(true)
    setPaymentMsg(null)
    try {
      const response = await ApiService.createSubscriptionPreference({
        userId: currentUser.firebaseUser.uid,
        planType: "basic",
        returnPath: "/dashboard/restaurant",
        payerEmail: currentUser.firebaseUser.email || undefined,
      })
      if (response.error || !response.data?.init_point) {
        throw new Error(response.error || "No se pudo iniciar la suscripción")
      }
      window.location.href = response.data.init_point
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : "Error al suscribirse")
      setSubscribing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!currentUser) return
    const confirmed = window.confirm(
      "¿Cancelar la suscripción?\n\nSe corta la renovación automática. Si todavía te queda tiempo del mes ya pagado, seguís operando hasta esa fecha."
    )
    if (!confirmed) return

    setCancellingSubscription(true)
    setPaymentMsg(null)
    try {
      const response = await ApiService.cancelSubscription()
      if (response.error) throw new Error(response.error)
      await refreshUserProfile()
      if (response.data?.immediate) {
        setPaymentMsg("Suscripción cancelada. Ya no podés operar hasta reactivar.")
      } else if (response.data?.accessUntil) {
        const until = new Date(response.data.accessUntil).toLocaleDateString("es-AR")
        setPaymentMsg(`Renovación cancelada. Seguís operando hasta el ${until}.`)
      } else {
        setPaymentMsg("Suscripción cancelada. No se renovará el próximo mes.")
      }
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : "No se pudo cancelar la suscripción")
    } finally {
      setCancellingSubscription(false)
    }
  }

  const togglePaymentMethod = (method: RestaurantPaymentMethod) => {
    setPaymentMethods((prev) => {
      if (prev.includes(method)) return prev.filter((m) => m !== method)
      return [...prev, method]
    })
  }

  const savePaymentSettings = async () => {
    if (!restaurantId) return
    if (!hasActiveSubscription) {
      setPaymentMsg("Necesitás una suscripción activa para configurar cobros.")
      return
    }
    if (paymentMethods.includes("mercadopago") && !mpConnected) {
      setPaymentMsg("Conectá Mercado Pago antes de habilitarlo como método.")
      return
    }
    if (paymentMethods.includes("transfer") && !transferAlias.trim() && !transferCbu.trim()) {
      setPaymentMsg("Para transferencia necesitás alias o CBU/CVU.")
      return
    }
    if (paymentMethods.length === 0) {
      setPaymentMsg("Elegí al menos un método de cobro.")
      return
    }
    const feeNum = Number(deliveryFeeInput)
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setPaymentMsg("El precio de envío tiene que ser 0 o más.")
      return
    }

    setSavingPayments(true)
    setPaymentMsg(null)
    try {
      await updateDoc(doc(db, "restaurants", restaurantId), {
        paymentMethods,
        deliveryFee: feeNum,
        transferInfo: {
          alias: transferAlias.trim() || null,
          cbu: transferCbu.trim() || null,
          bankName: transferBank.trim() || null,
          holderName: transferHolder.trim() || null,
          instructions: transferInstructions.trim() || null,
        },
        updatedAt: serverTimestamp(),
      })
      setRestaurant((prev) =>
        prev
          ? {
              ...prev,
              paymentMethods,
              deliveryFee: feeNum,
              transferInfo: {
                alias: transferAlias.trim() || undefined,
                cbu: transferCbu.trim() || undefined,
                bankName: transferBank.trim() || undefined,
                holderName: transferHolder.trim() || undefined,
                instructions: transferInstructions.trim() || undefined,
              },
            }
          : prev
      )
      setPaymentMsg("Formas de cobro y envío guardados.")
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : "No se pudo guardar")
    } finally {
      setSavingPayments(false)
    }
  }

  const connectMercadoPago = async () => {
    setConnectingMp(true)
    setPaymentMsg(null)
    try {
      const response = await ApiService.startMercadoPagoConnection()
      if (response.error || !response.data?.authorizationUrl) {
        throw new Error(response.error || "No se pudo iniciar la conexión")
      }
      window.location.href = response.data.authorizationUrl
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : "Error al conectar Mercado Pago")
      setConnectingMp(false)
    }
  }

  const disconnectMercadoPago = async () => {
    setConnectingMp(true)
    setPaymentMsg(null)
    try {
      const response = await ApiService.disconnectMercadoPagoConnection()
      if (response.error) throw new Error(response.error)
      await refreshUserProfile()
      setPaymentMethods((prev) => prev.filter((m) => m !== "mercadopago"))
      setPaymentMsg("Mercado Pago desconectado.")
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : "Error al desconectar")
    } finally {
      setConnectingMp(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  const approvedOrders = orders.filter((o) => o.paymentStatus === "approved")
  const actionablePending = orders.filter(
    (o) =>
      o.paymentStatus === "pending" &&
      (o.paymentMethod === "cash" || o.paymentMethod === "transfer") &&
      o.status !== "cancelado"
  )
  const otherOrders = orders.filter(
    (o) =>
      o.paymentStatus !== "approved" &&
      !(
        o.paymentStatus === "pending" &&
        (o.paymentMethod === "cash" || o.paymentMethod === "transfer") &&
        o.status !== "cancelado"
      )
  )
  const visibleOrders = showOtherPayments
    ? orders
    : [...approvedOrders, ...actionablePending].sort((a, b) => String(b.id).localeCompare(String(a.id)))

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

      {!hasActiveSubscription && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-950">Suscripción mensual requerida</p>
              <p className="text-sm text-amber-800">
                Sin suscripción activa no podés operar el menú ni los pedidos. El cobro se renueva solo cada mes con Mercado Pago.
              </p>
            </div>
            <Button
              className="shrink-0 rounded-full bg-amber-600 hover:bg-amber-700"
              disabled={subscribing}
              onClick={() => void handleSubscribe()}
            >
              {subscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activar suscripción mensual
            </Button>
          </div>
        </div>
      )}

      {hasActiveSubscription && cancelAtPeriodEnd && (
        <div className="border-b border-sky-200 bg-sky-50">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-sky-950">Renovación cancelada</p>
              <p className="text-sm text-sky-800">
                Seguís operando hasta el fin del período ya pagado
                {currentUser?.subscriptionEndsAt
                  ? ` (${currentUser.subscriptionEndsAt.toLocaleDateString("es-AR")})`
                  : ""}
                . Después se suspende el acceso.
              </p>
            </div>
            <Button
              className="shrink-0 rounded-full bg-sky-700 hover:bg-sky-800"
              disabled={subscribing}
              onClick={() => void handleSubscribe()}
            >
              {subscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reactivar renovación
            </Button>
          </div>
        </div>
      )}

      {hasActiveSubscription && !cancelAtPeriodEnd && (
        <div className="border-b border-emerald-100 bg-white">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Suscripción mensual activa con renovación automática.</p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-red-200 text-red-700 hover:bg-red-50"
              disabled={cancellingSubscription}
              onClick={() => void handleCancelSubscription()}
            >
              {cancellingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancelar suscripción
            </Button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {paymentMsg && (
          <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{paymentMsg}</p>
        )}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Pedidos entrantes</h2>
              {otherOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setShowOtherPayments((v) => !v)}
                >
                  {showOtherPayments
                    ? "Ocultar rechazados / cancelados"
                    : `Ver ${otherOrders.length} rechazados/cancelados`}
                </Button>
              )}
            </div>
            {visibleOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-100">
                {orders.length === 0
                  ? "Todavía no hay pedidos. Cuando lleguen, los verás acá."
                  : "No hay pedidos con pago aprobado. Usá el filtro para ver pendientes."}
              </div>
            ) : (
              visibleOrders.map((order) => {
                const next = getNextRestaurantStatus(order)
                const isDelivery = order.deliveryMode !== "retiro_en_local"
                return (
                  <div key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">Pedido #{order.id.slice(-6)}</p>
                        <p className="text-sm text-gray-500">{order.buyerEmail}</p>
                        {order.address && <p className="text-sm text-gray-500">{order.address}</p>}
                        {order.phone && <p className="text-sm text-gray-500">Tel: {order.phone}</p>}
                        {order.notes && (
                          <p className="mt-1 text-xs text-amber-700">Nota: {order.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{FOOD_ORDER_STATUS_LABELS[order.status]}</Badge>
                        <Badge
                          variant={order.paymentStatus === "approved" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>
                        {DELIVERY_MODE_LABELS[order.deliveryMode] || order.deliveryMode}
                      </span>
                      {order.paymentMethod && (
                        <span>
                          · Pago: {RESTAURANT_PAYMENT_METHOD_LABELS[order.paymentMethod]}
                        </span>
                      )}
                      {isDelivery && (
                        <span>
                          · Cadete:{" "}
                          {order.cadeteName || (order.cadeteId ? "Asignado" : "Sin cadete (pool)")}
                        </span>
                      )}
                      {isDelivery && order.deliveryFee > 0 && (
                        <span>· Envío cliente: ${formatPriceNumber(order.deliveryFee)}</span>
                      )}
                    </div>

                    {order.cadeteId && isDelivery && (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        El cadete no cobra por la app. Coordiná el pago del envío con{" "}
                        <strong>{order.cadeteName || "el cadete"}</strong> afuera
                        {order.deliveryFee > 0
                          ? ` (referencia envío: $${formatPriceNumber(order.deliveryFee)})`
                          : ""}
                        .
                      </p>
                    )}

                    <ul className="mt-3 space-y-1 text-sm text-gray-700">
                      {order.items.map((item, i) => {
                        const details =
                          item.selections?.map((s) => s.optionName).join(" · ") || null
                        return (
                          <li key={i}>
                            <span>
                              {item.quantity}x {item.name} — $
                              {formatPriceNumber(item.price * item.quantity)}
                            </span>
                            {details && !item.name.includes(details) && (
                              <span className="mt-0.5 block text-xs text-gray-500">{details}</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-servido-800">${formatPriceNumber(order.total)}</span>
                      <div className="flex flex-wrap gap-2">
                        {order.paymentStatus !== "approved" &&
                          (order.paymentMethod === "cash" || order.paymentMethod === "transfer") &&
                          order.status !== "cancelado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              disabled={!hasActiveSubscription}
                              onClick={() => void confirmOrderPayment(order)}
                            >
                              Confirmar cobro
                            </Button>
                          )}
                        {next && order.paymentStatus === "approved" && (
                          <Button
                            size="sm"
                            className="rounded-full bg-servido-800"
                            disabled={!hasActiveSubscription}
                            onClick={() => void advanceOrderStatus(order)}
                          >
                            {next === "en_preparacion"
                              ? "Preparar"
                              : next === "listo"
                                ? "Marcar listo"
                                : next === "entregado"
                                  ? "Entregado (retiro)"
                                  : "Avanzar estado"}
                          </Button>
                        )}
                      </div>
                      {order.status === "listo" && isDelivery && !order.cadeteId && (
                        <span className="w-full text-xs text-sky-700">Esperando cadete del pool</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === "menu" && restaurantId && (
          <MenuAdminPanel
            restaurantId={restaurantId}
            enabled={hasActiveSubscription}
            onNeedSubscription={() =>
              setPaymentMsg("Necesitás una suscripción activa para cargar el menú.")
            }
          />
        )}

        {activeTab === "profile" && (
          <div className="mx-auto max-w-lg space-y-4">
            <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100">
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

            {restaurant && (
              <RestaurantBrandingForm
                restaurant={restaurant}
                onUpdated={setRestaurant}
                disabled={!hasActiveSubscription}
              />
            )}

            <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100">
              <h2 className="font-semibold text-gray-900">Cómo cobrás</h2>
              <p className="text-sm text-gray-500">
                El cliente elige entre los métodos que actives. El dinero de Mercado Pago va a tu cuenta.
              </p>

              {paymentMsg && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{paymentMsg}</p>
              )}

              <div className="space-y-2 rounded-xl border border-gray-100 p-4">
                <Label>Precio de envío ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryFeeInput}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">
                  Lo paga el cliente en pedidos con delivery. Poné 0 si el envío es gratis. En retiro no se cobra.
                  Referencia para acordar el pago con el cadete afuera de la app.
                </p>
              </div>

              <div className="space-y-3">
                {(["cash", "transfer", "mercadopago"] as RestaurantPaymentMethod[]).map((method) => (
                  <label
                    key={method}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {RESTAURANT_PAYMENT_METHOD_LABELS[method]}
                    </span>
                    <Switch
                      checked={paymentMethods.includes(method)}
                      onCheckedChange={() => togglePaymentMethod(method)}
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                <p className="text-sm font-medium text-sky-950">Mercado Pago</p>
                <p className="mt-1 text-xs text-sky-800">
                  {mpConnected
                    ? "Cuenta conectada. Los cobros MP van a tu billetera."
                    : "Conectá tu cuenta para aceptar Mercado Pago (igual que los vendedores)."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!mpConnected ? (
                    <Button
                      size="sm"
                      className="rounded-full bg-sky-600 hover:bg-sky-700"
                      disabled={connectingMp}
                      onClick={() => void connectMercadoPago()}
                    >
                      {connectingMp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Conectar Mercado Pago
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={connectingMp}
                      onClick={() => void disconnectMercadoPago()}
                    >
                      Desconectar
                    </Button>
                  )}
                </div>
              </div>

              {paymentMethods.includes("transfer") && (
                <div className="space-y-3 rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">Datos de transferencia</p>
                  <div className="space-y-2">
                    <Label>Alias</Label>
                    <Input value={transferAlias} onChange={(e) => setTransferAlias(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>CBU / CVU</Label>
                    <Input value={transferCbu} onChange={(e) => setTransferCbu(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Titular</Label>
                    <Input value={transferHolder} onChange={(e) => setTransferHolder(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input value={transferBank} onChange={(e) => setTransferBank(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Instrucciones (opcional)</Label>
                    <Textarea
                      value={transferInstructions}
                      onChange={(e) => setTransferInstructions(e.target.value)}
                      className="rounded-xl"
                      placeholder="Ej: enviar comprobante por WhatsApp..."
                    />
                  </div>
                </div>
              )}

              <Button
                className="w-full rounded-full bg-servido-800"
                disabled={savingPayments || !hasActiveSubscription}
                onClick={() => void savePaymentSettings()}
              >
                {savingPayments ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar cobro y envío
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
