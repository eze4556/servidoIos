"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { doc, getDoc } from "firebase/firestore"
import {
  Bike,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Store,
  XCircle,
} from "lucide-react"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { isCadeteApproved } from "@/types/cadete"
import {
  claimFoodOrder,
  fetchCadeteDeliveries,
  markFoodOrderDelivered,
  subscribeAvailableFoodOrders,
} from "@/lib/cadete-orders"
import type { FoodOrder } from "@/types/restaurant"
import { formatPriceNumber } from "@/lib/utils"

const DEFAULT_TITLE = "Cadete · Servido"

/** Navegación a un destino (usa la ubicación actual del cadete como origen). */
function navigationUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
}

/** Ruta completa: local → cliente. */
function routeUrl(origin: string, destination: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
}

function telUrl(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`
}

/** Patrón corto-corto-largo: “llegó un pedido” (solo si el browser lo permite). */
function vibrateNewOrder() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return
  try {
    navigator.vibrate([120, 80, 120, 80, 220])
  } catch {
    // Algunos browsers bloquean vibrate sin gesto; ignorar.
  }
}

export default function CadeteDashboardPage() {
  const { currentUser, handleLogout } = useAuth()
  const [available, setAvailable] = useState<FoodOrder[]>([])
  const [active, setActive] = useState<FoodOrder | null>(null)
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevAvailableCount = useRef<number | null>(null)

  const approved = isCadeteApproved(currentUser?.status, currentUser?.isActive)
  const rejected = currentUser?.status === "rejected"
  const uid = currentUser?.firebaseUser.uid
  const cadeteName = currentUser?.name || currentUser?.firebaseUser.displayName || "Cadete"
  const cadeteZone = currentUser?.zone

  const resolveRestaurantAddress = useCallback(async (order: FoodOrder | null) => {
    if (!order) {
      setRestaurantAddress(null)
      return
    }
    if (order.restaurantAddress) {
      setRestaurantAddress(order.restaurantAddress)
      return
    }
    try {
      const snap = await getDoc(doc(db, "restaurants", order.restaurantId))
      if (snap.exists()) {
        const data = snap.data()
        setRestaurantAddress((data.address as string) || null)
      } else {
        setRestaurantAddress(null)
      }
    } catch {
      setRestaurantAddress(null)
    }
  }, [])

  const loadActive = useCallback(async () => {
    if (!uid || !approved) return
    try {
      const mine = await fetchCadeteDeliveries(uid)
      const current = mine.find((o) => o.status === "en_camino") || null
      setActive(current)
      await resolveRestaurantAddress(current)
    } catch (err) {
      console.error(err)
      setError("No se pudo cargar tu pedido.")
    }
  }, [uid, approved, resolveRestaurantAddress])

  useEffect(() => {
    if (!uid || !approved) {
      setLoading(false)
      return
    }

    setLoading(true)
    void loadActive().finally(() => setLoading(false))

    const unsubscribe = subscribeAvailableFoodOrders(
      cadeteZone,
      (orders) => {
        setAvailable(orders)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError("Sin conexión a pedidos.")
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [uid, approved, cadeteZone, loadActive])

  useEffect(() => {
    if (!approved) return
    if (available.length > 0 && !active) {
      document.title = `(${available.length}) Nuevo pedido · Servido`
    } else if (active) {
      document.title = "En camino · Servido"
    } else {
      document.title = DEFAULT_TITLE
    }
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [available.length, approved, active])

  useEffect(() => {
    if (!approved || active) {
      prevAvailableCount.current = available.length
      return
    }
    const prev = prevAvailableCount.current
    if (prev !== null && available.length > prev) {
      vibrateNewOrder()
    }
    prevAvailableCount.current = available.length
  }, [available.length, approved, active])

  const handleClaim = async (orderId: string) => {
    if (!uid || busy) return
    setBusy(true)
    setError(null)
    try {
      await claimFoodOrder(orderId, uid, cadeteName)
      await loadActive()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo tomar.")
      await loadActive()
    } finally {
      setBusy(false)
    }
  }

  const handleDelivered = async () => {
    if (!uid || !active || busy) return
    setBusy(true)
    setError(null)
    try {
      await markFoodOrderDelivered(active.id, uid)
      setActive(null)
      setRestaurantAddress(null)
      await loadActive()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar.")
    } finally {
      setBusy(false)
    }
  }

  if (!approved) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        {rejected ? (
          <XCircle className="mb-4 h-14 w-14 text-red-400" />
        ) : (
          <Clock className="mb-4 h-14 w-14 text-sky-400" />
        )}
        <h1 className="text-2xl font-bold">{rejected ? "No aprobado" : "En revisión"}</h1>
        <p className="mt-3 max-w-xs text-base text-slate-300">
          {rejected
            ? "Tu postulación fue rechazada."
            : "Te avisamos por email cuando puedas salir a entregar."}
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-slate-900"
        >
          <Home className="h-5 w-5" />
          Inicio
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
      </div>
    )
  }

  if (active) {
    const pickupAddress = restaurantAddress
    const dropoffAddress = active.address || null
    const fullRoute =
      pickupAddress && dropoffAddress ? routeUrl(pickupAddress, dropoffAddress) : null

    return (
      <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-white">
        <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <Bike className="h-5 w-5 text-sky-400" />
            <span className="text-sm font-medium text-slate-300">En camino</span>
          </div>
          <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-300">
            #{active.id.slice(-6)}
          </span>
        </header>

        <div className="flex flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (
            <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-3 text-center text-sm text-red-200">
              {error}
            </p>
          )}

          <p className="text-sm uppercase tracking-wide text-slate-400">Retirá en</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">{active.restaurantName}</h1>
          {pickupAddress && <p className="mt-1 text-sm text-slate-400">{pickupAddress}</p>}

          {dropoffAddress && (
            <div className="mt-5 rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
              <p className="flex items-start gap-2 text-xs font-medium uppercase text-slate-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                Entregar en
              </p>
              <p className="mt-2 text-xl font-semibold leading-snug">{dropoffAddress}</p>
            </div>
          )}

          <div className="mt-3 grid gap-3">
            {pickupAddress && (
              <a
                href={navigationUrl(pickupAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-sky-600 text-base font-bold active:bg-sky-500"
              >
                <Store className="h-5 w-5" />
                Ir al local
              </a>
            )}
            {dropoffAddress && (
              <a
                href={navigationUrl(dropoffAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 text-base font-bold text-slate-950 active:bg-amber-400"
              >
                <Navigation className="h-5 w-5" />
                Ir al cliente
              </a>
            )}
            {fullRoute && (
              <a
                href={fullRoute}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 text-sm font-semibold text-sky-300 ring-1 ring-slate-600 active:bg-slate-700"
              >
                <MapPin className="h-4 w-4" />
                Ver ruta completa (local → cliente)
              </a>
            )}
          </div>

          {active.phone && (
            <a
              href={telUrl(active.phone)}
              className="mt-3 flex h-16 items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-lg font-bold active:bg-emerald-500"
            >
              <Phone className="h-6 w-6" />
              Llamar cliente
            </a>
          )}

          <div className="mt-4 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Tu cobro</p>
            {active.deliveryFee > 0 ? (
              <p className="mt-1 text-2xl font-bold text-amber-200">
                Envío ${formatPriceNumber(active.deliveryFee)}
              </p>
            ) : (
              <p className="mt-1 text-base font-semibold text-amber-200">Sin cargo de envío en este pedido</p>
            )}
            <p className="mt-2 text-sm leading-snug text-amber-100/80">
              Servido no te paga por la app. El restaurante te abona afuera (efectivo o transferencia).
              Este monto es solo referencia del envío que pagó el cliente.
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800">
            <p className="text-xs uppercase text-slate-500">Pedido</p>
            <ul className="mt-2 space-y-1 text-base text-slate-200">
              {active.items.map((item, i) => (
                <li key={i}>
                  {item.quantity}× {item.name}
                </li>
              ))}
            </ul>
            {active.notes && (
              <p className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
                {active.notes}
              </p>
            )}
            <p className="mt-3 text-lg font-bold text-white">${formatPriceNumber(active.total)}</p>
          </div>

          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelivered()}
              className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-8 w-8" />
                  Entregado
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-sm text-slate-400">Hola, {cadeteName.split(" ")[0]}</p>
          <h1 className="text-xl font-bold">
            {available.length > 0 ? "Pedidos listos" : "Esperando"}
          </h1>
        </div>
        {cadeteZone && (
          <span className="max-w-[40%] truncate rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
            {cadeteZone}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {error && (
          <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        {available.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 ring-1 ring-slate-700">
              <Bike className="h-10 w-10 text-sky-400" />
            </div>
            <p className="text-xl font-semibold">Sin pedidos ahora</p>
            <p className="mt-2 max-w-[240px] text-sm text-slate-400">
              Dejá la app abierta. Aparecen solos cuando haya algo en tu zona.
            </p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-10 text-sm text-slate-500 underline-offset-2 hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {available.map((order) => (
              <li
                key={order.id}
                className="overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-slate-700"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-2xl font-bold leading-tight">{order.restaurantName}</h2>
                    <span className="shrink-0 text-lg font-bold text-emerald-400">
                      ${formatPriceNumber(order.total)}
                    </span>
                  </div>

                  {order.address && (
                    <p className="mt-3 flex items-start gap-2 text-base text-slate-200">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                      <span className="leading-snug">{order.address}</span>
                    </p>
                  )}

                  <p className="mt-2 text-sm text-slate-400">
                    {order.items.reduce((n, i) => n + i.quantity, 0)} ítems
                    {order.deliveryFee > 0 ? ` · Envío $${formatPriceNumber(order.deliveryFee)}` : ""}
                    {order.notes ? " · Tiene nota" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Cobro con el restaurante, fuera de la app
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleClaim(order.id)}
                  className="flex h-16 w-full items-center justify-center gap-2 bg-sky-500 text-xl font-black text-slate-950 active:bg-sky-400 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : "Tomar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
