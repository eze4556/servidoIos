"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useFoodCart } from "@/contexts/food-cart-context"
import { ApiService } from "@/lib/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { formatPriceNumber } from "@/lib/utils"
import type {
  DeliveryMode,
  RestaurantPaymentMethod,
  RestaurantTransferInfo,
} from "@/types/restaurant"
import { RESTAURANT_PAYMENT_METHOD_LABELS } from "@/types/restaurant"

interface FoodCartDrawerProps {
  deliveryMode: DeliveryMode
  /** Precio de envío configurado por el restaurante */
  restaurantDeliveryFee?: number
  paymentMethods?: RestaurantPaymentMethod[]
  transferInfo?: RestaurantTransferInfo
}

export function FoodCartDrawer({
  deliveryMode,
  restaurantDeliveryFee = 300,
  paymentMethods = ["cash", "transfer"],
  transferInfo,
}: FoodCartDrawerProps) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const { items, restaurantName, itemCount, subtotal, updateQuantity, removeItem, clearCart, restaurantId } =
    useFoodCart()
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<RestaurantPaymentMethod | null>(null)

  const enabledMethods = useMemo(() => {
    const list = paymentMethods?.length ? paymentMethods : (["cash", "transfer"] as RestaurantPaymentMethod[])
    return list.filter((m) => m !== "transfer" || Boolean(transferInfo?.alias || transferInfo?.cbu))
  }, [paymentMethods, transferInfo])

  useEffect(() => {
    if (enabledMethods.length === 1) setPaymentMethod(enabledMethods[0])
    else if (paymentMethod && !enabledMethods.includes(paymentMethod)) setPaymentMethod(null)
  }, [enabledMethods, paymentMethod])

  const configuredFee =
    Number.isFinite(restaurantDeliveryFee) && restaurantDeliveryFee >= 0
      ? restaurantDeliveryFee
      : 300
  const deliveryFee = deliveryMode === "retiro_en_local" ? 0 : configuredFee
  const total = subtotal + deliveryFee

  const handleCheckout = async () => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    if (!restaurantId || items.length === 0) return
    if (deliveryMode !== "retiro_en_local" && !address.trim()) {
      setError("Ingresá tu dirección de entrega")
      return
    }
    if (!paymentMethod) {
      setError("Elegí cómo vas a pagar")
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const response = await ApiService.createFoodPreference({
        restaurantId,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || "",
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        deliveryMode,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        deliveryFee,
        paymentMethod,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (paymentMethod === "mercadopago") {
        if (!response.data?.init_point) {
          throw new Error("No se pudo iniciar el pago con Mercado Pago")
        }
        clearCart()
        window.location.href = response.data.init_point
        return
      }

      clearCart()
      if (paymentMethod === "transfer") {
        const info = response.data?.transferInfo || transferInfo
        setSuccessMsg(
          [
            "Pedido creado. Transferí el total y el restaurante va a confirmar el cobro.",
            info?.alias ? `Alias: ${info.alias}` : null,
            info?.cbu ? `CBU/CVU: ${info.cbu}` : null,
            info?.holderName ? `Titular: ${info.holderName}` : null,
            info?.bankName ? `Banco: ${info.bankName}` : null,
            info?.instructions || null,
          ]
            .filter(Boolean)
            .join("\n")
        )
      } else {
        setSuccessMsg("Pedido creado. Vas a pagar en efectivo al recibir o retirar.")
      }
      setTimeout(() => {
        setOpen(false)
        router.push("/pedidos/comida")
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el pedido")
    } finally {
      setLoading(false)
    }
  }

  if (itemCount === 0) return null

  const ctaLabel =
    paymentMethod === "mercadopago"
      ? "Pagar con Mercado Pago"
      : paymentMethod === "transfer"
        ? "Confirmar pedido (transferencia)"
        : paymentMethod === "cash"
          ? "Confirmar pedido (efectivo)"
          : "Confirmar pedido"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-20 right-4 z-40 h-14 rounded-full bg-servido-800 px-6 shadow-lg hover:bg-servido-900 lg:bottom-8">
          <ShoppingBag className="mr-2 h-5 w-5" />
          Ver pedido ({itemCount})
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{restaurantName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {items.map((item) => (
            <div key={item.menuItemId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">${formatPriceNumber(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.menuItemId)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          {deliveryMode !== "retiro_en_local" && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Dirección de entrega</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, piso" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9..." />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sin cebolla, timbre roto..." />
          </div>

          <div className="space-y-2 pt-2">
            <Label>Forma de pago</Label>
            {enabledMethods.length === 0 ? (
              <p className="text-sm text-amber-700">
                Este restaurante todavía no configuró cómo cobrar. Probá más tarde.
              </p>
            ) : (
              <div className="grid gap-2">
                {enabledMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                      paymentMethod === method
                        ? "border-servido-800 bg-servido-50 text-servido-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {RESTAURANT_PAYMENT_METHOD_LABELS[method]}
                    {method === "transfer" && (transferInfo?.alias || transferInfo?.cbu) && (
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        {transferInfo.alias ? `Alias ${transferInfo.alias}` : `CBU ${transferInfo.cbu}`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${formatPriceNumber(subtotal)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Envío</span>
              <span>${formatPriceNumber(deliveryFee)}</span>
            </div>
          )}
          <div className="mb-4 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>${formatPriceNumber(total)}</span>
          </div>
          {error && <p className="mb-3 whitespace-pre-line text-sm text-red-600">{error}</p>}
          {successMsg && <p className="mb-3 whitespace-pre-line text-sm text-emerald-700">{successMsg}</p>}
          {!currentUser ? (
            <Button asChild className="w-full rounded-full bg-servido-800">
              <Link href="/login">Iniciá sesión para pedir</Link>
            </Button>
          ) : (
            <Button
              className="w-full rounded-full bg-servido-800"
              onClick={() => void handleCheckout()}
              disabled={loading || enabledMethods.length === 0 || !paymentMethod}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {ctaLabel}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
