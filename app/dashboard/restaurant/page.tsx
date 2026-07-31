"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
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
  getDeliveryModeLabel,
  getFoodOrderStatusLabel,
  getRestaurantPaymentMethodLabel,
} from "@/lib/i18n/restaurant-labels"
import { usePriceFormat } from "@/hooks/use-price-format"
import { cn } from "@/lib/utils"
import { notifyFoodOrderStatus } from "@/lib/notifications"

type RestaurantTab = "orders" | "menu" | "profile"

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
  const { formatPrice, formatPriceNumber } = usePriceFormat()
  const t = useTranslations("restaurantDashboard")
  const tRestaurants = useTranslations("restaurants")
  const tFood = useTranslations("foodOrders")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

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
      setPaymentMsg(t("mpConnected"))
      setActiveTab("profile")
      void refreshUserProfile()
      window.history.replaceState({}, "", "/dashboard/restaurant")
    } else if (flag === "error") {
      setPaymentMsg(t("mpConnectError"))
      setActiveTab("profile")
      window.history.replaceState({}, "", "/dashboard/restaurant")
    } else if (sub === "success") {
      setPaymentMsg(t("subSuccess"))
      void refreshUserProfile()
      window.history.replaceState({}, "", "/dashboard/restaurant")
    } else if (sub === "failure") {
      setPaymentMsg(t("subError"))
      window.history.replaceState({}, "", "/dashboard/restaurant")
    }
  }, [refreshUserProfile, t])

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
      setPaymentMsg(t("needSubscription"))
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
      setPaymentMsg(t("needSubscription"))
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
        throw new Error(response.error || t("subscribeStartError"))
      }
      window.location.href = response.data.init_point
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : t("subscribeError"))
      setSubscribing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!currentUser) return
    const confirmed = window.confirm(t("cancelConfirm"))
    if (!confirmed) return

    setCancellingSubscription(true)
    setPaymentMsg(null)
    try {
      const response = await ApiService.cancelSubscription()
      if (response.error) throw new Error(response.error)
      await refreshUserProfile()
      if (response.data?.immediate) {
        setPaymentMsg(t("cancelEndedNow"))
      } else if (response.data?.accessUntil) {
        const until = new Date(response.data.accessUntil).toLocaleDateString(dateLocale)
        setPaymentMsg(t("cancelOperatingUntil", { date: until }))
      } else {
        setPaymentMsg(t("cancelAtPeriodEnd"))
      }
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : t("cancelError"))
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
      setPaymentMsg(t("needSubscriptionPayments"))
      return
    }
    if (paymentMethods.includes("mercadopago") && !mpConnected) {
      setPaymentMsg(t("mpConnectBeforeEnable"))
      return
    }
    if (paymentMethods.includes("transfer") && !transferAlias.trim() && !transferCbu.trim()) {
      setPaymentMsg(t("transferNeedsAlias"))
      return
    }
    if (paymentMethods.length === 0) {
      setPaymentMsg(t("pickPaymentMethod"))
      return
    }
    const feeNum = Number(deliveryFeeInput)
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setPaymentMsg(t("invalidDeliveryFee"))
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
      setPaymentMsg(t("paymentsSaved"))
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : t("saveError"))
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
        throw new Error(response.error || t("mpConnectionStartError"))
      }
      window.location.href = response.data.authorizationUrl
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : t("mpConnectStartError"))
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
      setPaymentMsg(t("mpDisconnected"))
    } catch (err) {
      setPaymentMsg(err instanceof Error ? err.message : t("mpDisconnectError"))
    } finally {
      setConnectingMp(false)
    }
  }

  const tabs: { id: RestaurantTab; label: string; icon: typeof ClipboardList }[] = useMemo(
    () => [
      { id: "orders", label: t("tabOrders"), icon: ClipboardList },
      { id: "menu", label: t("tabMenu"), icon: Menu },
      { id: "profile", label: t("tabProfile"), icon: Settings },
    ],
    [t]
  )

  const labelRestaurants = (key: string) => tRestaurants(key)
  const labelFoodStatus = (key: string) => tFood(key)

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-servido-gold/20 text-servido-800">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-bold text-gray-900">{restaurant?.name || t("myRestaurant")}</h1>
              <p className="text-xs text-gray-500">{t("panelTitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/restaurantes/${restaurantId}`}>{t("viewStore")}</Link>
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
              <p className="font-semibold text-amber-950">{t("subRequiredTitle")}</p>
              <p className="text-sm text-amber-800">{t("subRequiredBody")}</p>
            </div>
            <Button
              className="shrink-0 rounded-full bg-amber-600 hover:bg-amber-700"
              disabled={subscribing}
              onClick={() => void handleSubscribe()}
            >
              {subscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("activateSubscription")}
            </Button>
          </div>
        </div>
      )}

      {hasActiveSubscription && cancelAtPeriodEnd && (
        <div className="border-b border-sky-200 bg-sky-50">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-sky-950">{t("renewalCancelledTitle")}</p>
              <p className="text-sm text-sky-800">
                {t("renewalCancelledBody", {
                  date: currentUser?.subscriptionEndsAt
                    ? t("renewalCancelledDate", {
                        date: currentUser.subscriptionEndsAt.toLocaleDateString(dateLocale),
                      })
                    : "",
                })}
              </p>
            </div>
            <Button
              className="shrink-0 rounded-full bg-sky-700 hover:bg-sky-800"
              disabled={subscribing}
              onClick={() => void handleSubscribe()}
            >
              {subscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("reactivateRenewal")}
            </Button>
          </div>
        </div>
      )}

      {hasActiveSubscription && !cancelAtPeriodEnd && (
        <div className="border-b border-emerald-100 bg-white">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">{t("subActiveAuto")}</p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-red-200 text-red-700 hover:bg-red-50"
              disabled={cancellingSubscription}
              onClick={() => void handleCancelSubscription()}
            >
              {cancellingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("cancelSubscription")}
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
              <h2 className="text-lg font-semibold text-gray-900">{t("incomingOrders")}</h2>
              {otherOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setShowOtherPayments((v) => !v)}
                >
                  {showOtherPayments
                    ? t("hideRejected")
                    : t("showRejected", { count: otherOrders.length })}
                </Button>
              )}
            </div>
            {visibleOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-100">
                {orders.length === 0 ? t("emptyOrders") : t("emptyApproved")}
              </div>
            ) : (
              visibleOrders.map((order) => {
                const next = getNextRestaurantStatus(order)
                const isDelivery = order.deliveryMode !== "retiro_en_local"
                return (
                  <div key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {t("orderNumber", { id: order.id.slice(-6) })}
                        </p>
                        <p className="text-sm text-gray-500">{order.buyerEmail}</p>
                        {order.address && <p className="text-sm text-gray-500">{order.address}</p>}
                        {order.phone && (
                          <p className="text-sm text-gray-500">
                            {t("phonePrefix")} {order.phone}
                          </p>
                        )}
                        {order.notes && (
                          <p className="mt-1 text-xs text-amber-700">
                            {t("notePrefix")} {order.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">
                          {getFoodOrderStatusLabel(labelFoodStatus, order.status)}
                        </Badge>
                        <Badge
                          variant={order.paymentStatus === "approved" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {t(`paymentStatus.${order.paymentStatus}` as "paymentStatus.pending") ||
                            order.paymentStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{getDeliveryModeLabel(labelRestaurants, order.deliveryMode)}</span>
                      {order.paymentMethod && (
                        <span>
                          · {t("paymentPrefix")}{" "}
                          {getRestaurantPaymentMethodLabel(labelRestaurants, order.paymentMethod)}
                        </span>
                      )}
                      {isDelivery && (
                        <span>
                          · {t("cadetePrefix")}{" "}
                          {order.cadeteName ||
                            (order.cadeteId ? t("cadeteAssigned") : t("cadetePool"))}
                        </span>
                      )}
                      {isDelivery && order.deliveryFee > 0 && (
                        <span>
                          · {t("clientDeliveryFee")} {formatPrice(order.deliveryFee)}
                        </span>
                      )}
                    </div>

                    {order.cadeteId && isDelivery && (
                      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {t("cadeteDisclaimer", {
                          name: order.cadeteName || t("cadeteDefaultName"),
                          feeRef:
                            order.deliveryFee > 0
                              ? t("cadeteFeeRef", {
                                  amount: formatPrice(order.deliveryFee),
                                })
                              : "",
                        })}
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
                      <span className="font-bold text-servido-800">{formatPrice(order.total)}</span>
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
                              {t("confirmPayment")}
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
                              ? t("actionPrepare")
                              : next === "listo"
                                ? t("actionReady")
                                : next === "entregado"
                                  ? t("actionPickupDone")
                                  : t("actionAdvance")}
                          </Button>
                        )}
                      </div>
                      {order.status === "listo" && isDelivery && !order.cadeteId && (
                        <span className="w-full text-xs text-sky-700">{t("waitingCadete")}</span>
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
            onNeedSubscription={() => setPaymentMsg(t("needSubscriptionMenu"))}
          />
        )}

        {activeTab === "profile" && (
          <div className="mx-auto max-w-lg space-y-4">
            <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100">
              <h2 className="font-semibold text-gray-900">{t("profileTitle")}</h2>
              <p className="text-sm text-gray-600">
                <strong>{t("statusLabel")}</strong> {restaurant?.status || "pending"}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("addressLabel")}</strong> {restaurant?.address}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("zoneLabel")}</strong> {restaurant?.zone || t("zoneUndefined")}
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => router.push("/dashboard/restaurant/onboarding")}
              >
                {t("editProfile")}
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
              <h2 className="font-semibold text-gray-900">{t("howYouCharge")}</h2>
              <p className="text-sm text-gray-500">{t("howYouChargeHint")}</p>

              {paymentMsg && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{paymentMsg}</p>
              )}

              <div className="space-y-2 rounded-xl border border-gray-100 p-4">
                <Label>{t("deliveryFeeLabel")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryFeeInput}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">{t("deliveryFeeProfileHint")}</p>
              </div>

              <div className="space-y-3">
                {(["cash", "transfer", "mercadopago"] as RestaurantPaymentMethod[]).map((method) => (
                  <label
                    key={method}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {getRestaurantPaymentMethodLabel(labelRestaurants, method)}
                    </span>
                    <Switch
                      checked={paymentMethods.includes(method)}
                      onCheckedChange={() => togglePaymentMethod(method)}
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                <p className="text-sm font-medium text-sky-950">{t("mpTitle")}</p>
                <p className="mt-1 text-xs text-sky-800">
                  {mpConnected ? t("mpConnectedHint") : t("mpNotConnectedHint")}
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
                      {t("connectMp")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={connectingMp}
                      onClick={() => void disconnectMercadoPago()}
                    >
                      {t("disconnectMp")}
                    </Button>
                  )}
                </div>
              </div>

              {paymentMethods.includes("transfer") && (
                <div className="space-y-3 rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">{t("transferData")}</p>
                  <div className="space-y-2">
                    <Label>{t("alias")}</Label>
                    <Input value={transferAlias} onChange={(e) => setTransferAlias(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("cbu")}</Label>
                    <Input value={transferCbu} onChange={(e) => setTransferCbu(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("holder")}</Label>
                    <Input value={transferHolder} onChange={(e) => setTransferHolder(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("bank")}</Label>
                    <Input value={transferBank} onChange={(e) => setTransferBank(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("instructionsOptional")}</Label>
                    <Textarea
                      value={transferInstructions}
                      onChange={(e) => setTransferInstructions(e.target.value)}
                      className="rounded-xl"
                      placeholder={t("transferPlaceholder")}
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
                {t("savePayments")}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
