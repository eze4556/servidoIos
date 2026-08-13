"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { useFoodCart } from "@/contexts/food-cart-context"
import { ApiService } from "@/lib/services/api"
import { getRestaurantPaymentMethodLabel } from "@/lib/i18n/restaurant-labels"
import { describeApiError } from "@/lib/i18n/translate-client-error"
import {
  DEFAULT_DELIVERY_PRICING,
  fetchDeliveryPricing,
  quoteDeliveryAmounts,
  type DeliveryPricing,
} from "@/lib/delivery-pricing"
import { hasValidCoordinates, type BusinessLocation } from "@/lib/geo"
import { BusinessLocationPicker } from "@/components/location/business-location-picker"
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
import { usePriceFormat } from "@/hooks/use-price-format"
import type { DeliveryMode, RestaurantPaymentMethod } from "@/types/restaurant"

interface FoodCartDrawerProps {
  deliveryMode: DeliveryMode
  restaurantCoordinates?: { latitude: number; longitude: number } | null
  /** Métodos del restaurante (retiro). Delivery siempre fuerza Mercado Pago. */
  paymentMethods?: RestaurantPaymentMethod[]
}

export function FoodCartDrawer({
  deliveryMode,
  restaurantCoordinates = null,
  paymentMethods = ["cash", "mercadopago"],
}: FoodCartDrawerProps) {
  const t = useTranslations("foodCart")
  const tApi = useTranslations("apiErrors")
  const tRestaurants = useTranslations("restaurants")
  const { formatPrice, formatPriceNumber } = usePriceFormat()
  const { currentUser } = useAuth()
  const router = useRouter()
  const { items, restaurantName, itemCount, subtotal, updateQuantity, removeItem, clearCart, restaurantId } =
    useFoodCart()
  const [open, setOpen] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState<BusinessLocation | null>(null)
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<RestaurantPaymentMethod | null>(null)
  const [pricing, setPricing] = useState<DeliveryPricing>(DEFAULT_DELIVERY_PRICING)

  const isPickup = deliveryMode === "retiro_en_local"

  const enabledMethods = useMemo(() => {
    if (!isPickup) return ["mercadopago"] as RestaurantPaymentMethod[]
    const list = (paymentMethods?.length ? paymentMethods : ["cash", "mercadopago"]).filter(
      (m) => m === "mercadopago" || m === "cash"
    )
    return list.length ? list : (["mercadopago", "cash"] as RestaurantPaymentMethod[])
  }, [isPickup, paymentMethods])

  useEffect(() => {
    if (enabledMethods.length === 1) setPaymentMethod(enabledMethods[0])
    else if (paymentMethod && !enabledMethods.includes(paymentMethod)) setPaymentMethod(null)
  }, [enabledMethods, paymentMethod])

  useEffect(() => {
    void fetchDeliveryPricing().then(setPricing)
  }, [])

  const restaurantLat = Number(restaurantCoordinates?.latitude)
  const restaurantLng = Number(restaurantCoordinates?.longitude)
  const restaurantHasCoords = hasValidCoordinates(restaurantLat, restaurantLng)

  const quote = useMemo(() => {
    if (isPickup) {
      return quoteDeliveryAmounts({
        subtotal,
        restaurantLat: 0,
        restaurantLng: 0,
        deliveryLat: 0,
        deliveryLng: 0,
        pricing,
        isPickup: true,
      })
    }
    if (
      !restaurantHasCoords ||
      !deliveryLocation ||
      !hasValidCoordinates(deliveryLocation.latitude, deliveryLocation.longitude)
    ) {
      return null
    }
    return quoteDeliveryAmounts({
      subtotal,
      restaurantLat,
      restaurantLng,
      deliveryLat: deliveryLocation.latitude,
      deliveryLng: deliveryLocation.longitude,
      pricing,
    })
  }, [isPickup, subtotal, pricing, restaurantHasCoords, restaurantLat, restaurantLng, deliveryLocation])

  const deliveryFee = quote?.deliveryFee ?? 0
  const total = subtotal + deliveryFee

  const handleCheckout = async () => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    if (!restaurantId || items.length === 0) return

    if (!isPickup) {
      if (!restaurantHasCoords) {
        setError(t("errorRestaurantLocation"))
        return
      }
      if (!deliveryLocation || !hasValidCoordinates(deliveryLocation.latitude, deliveryLocation.longitude)) {
        setError(t("errorLocation"))
        return
      }
    }
    if (!paymentMethod) {
      setError(t("errorPayment"))
      return
    }
    if (!isPickup && paymentMethod !== "mercadopago") {
      setError(t("errorDeliveryOnlyMp"))
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
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          selections: i.selections?.map((s) => ({
            groupId: s.groupId,
            optionId: s.optionId,
          })),
          promotionId: i.promotionId,
        })),
        deliveryMode,
        address: deliveryLocation?.label || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
        deliveryLat: deliveryLocation?.latitude,
        deliveryLng: deliveryLocation?.longitude,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (paymentMethod === "mercadopago") {
        if (!response.data?.init_point) {
          throw new Error(t("errorMpInit"))
        }
        clearCart()
        window.location.href = response.data.init_point
        return
      }

      clearCart()
      setSuccessMsg(t("successCashPickup"))
      setTimeout(() => {
        setOpen(false)
        router.push("/pedidos/comida")
      }, 2500)
    } catch (err) {
      setError(describeApiError(err, tApi, t("errorCheckout")))
    } finally {
      setLoading(false)
    }
  }

  if (itemCount === 0) return null

  const ctaLabel =
    paymentMethod === "mercadopago"
      ? t("ctaMercadopago")
      : paymentMethod === "cash"
        ? t("ctaCashPickup")
        : t("ctaDefault")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-[7.5rem] right-4 z-40 h-14 rounded-full bg-servido-800 px-6 shadow-lg hover:bg-servido-900 lg:bottom-8">
          <ShoppingBag className="mr-2 h-5 w-5" />
          {t("viewOrder", { count: itemCount })}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{restaurantName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {items.map((item) => (
            <div key={item.lineId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                {item.subtitle && <p className="line-clamp-2 text-xs text-gray-500">{item.subtitle}</p>}
                <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.lineId)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          {!isPickup && (
            <div className="space-y-3 pt-2">
              {!restaurantHasCoords && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("errorRestaurantLocation")}</p>
              )}
              <BusinessLocationPicker
                value={deliveryLocation}
                onChange={setDeliveryLocation}
                label={t("deliveryAddress")}
                helperText={t("locationHelper")}
              />
              {quote && (
                <p className="text-sm text-servido-800">
                  {t("deliveryQuote", {
                    km: formatPriceNumber(quote.distanceKm),
                    fee: formatPrice(quote.deliveryFee),
                  })}
                </p>
              )}
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} />
              </div>
              <p className="text-xs text-gray-500">{t("deliveryMpOnlyHint")}</p>
            </div>
          )}

          {isPickup && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-gray-600">{t("pickupHint")}</p>
          )}

          <div className="space-y-2">
            <Label>{t("notesOptional")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
          </div>

          <div className="space-y-2 pt-2">
            <Label>{t("paymentMethod")}</Label>
            {enabledMethods.length === 0 ? (
              <p className="text-sm text-amber-700">{t("noPaymentConfigured")}</p>
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
                    {getRestaurantPaymentMethodLabel(tRestaurants, method)}
                    {method === "cash" && isPickup && (
                      <span className="mt-1 block text-xs font-normal text-gray-500">{t("cashPickupHint")}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>{t("subtotal")}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>{t("deliveryFee")}</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
          )}
          <div className="mb-4 flex justify-between font-bold text-gray-900">
            <span>{t("total")}</span>
            <span>{formatPrice(total)}</span>
          </div>
          {error && <p className="mb-3 whitespace-pre-line text-sm text-red-600">{error}</p>}
          {successMsg && <p className="mb-3 whitespace-pre-line text-sm text-emerald-700">{successMsg}</p>}
          {!currentUser ? (
            <Button asChild className="w-full rounded-full bg-servido-800">
              <Link href="/login">{t("loginToOrder")}</Link>
            </Button>
          ) : (
            <Button
              className="w-full rounded-full bg-servido-800"
              onClick={() => void handleCheckout()}
              disabled={
                loading ||
                enabledMethods.length === 0 ||
                !paymentMethod ||
                (!isPickup && !quote)
              }
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
