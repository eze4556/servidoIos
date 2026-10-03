"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Minus, Plus, ShoppingBag } from "lucide-react"
import type { LivePinnedProduct } from "@/types/live"
import { useAuth } from "@/contexts/auth-context"
import { ApiService } from "@/lib/services/api"
import { translateClientError } from "@/lib/i18n/translate-client-error"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { ShippingForm, type ShippingAddress } from "@/components/cart/shipping-form"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function formatPrice(amount: number, currency?: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

type Step = "summary" | "shipping"

export function LiveBuySheet({
  open,
  onOpenChange,
  product,
  liveId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: LivePinnedProduct | null
  liveId: string
}) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const tApi = useTranslations("apiErrors")
  const [step, setStep] = useState<Step>("summary")
  const [quantity, setQuantity] = useState(1)
  const [paying, setPaying] = useState(false)

  const original = product?.originalPrice ?? product?.price ?? 0
  const unit = product?.price ?? 0
  const hasDeal = original > unit
  const total = unit * quantity

  const reset = () => {
    setStep("summary")
    setQuantity(1)
    setPaying(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const goPay = async (address: ShippingAddress) => {
    if (!currentUser || !product) return
    setPaying(true)
    try {
      const response = await ApiService.createSingleProductPurchase({
        productId: product.productId,
        quantity,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || "",
        shippingAddress: address,
        liveId,
      })

      if (response.error) throw new Error(response.error)
      if (!response.data?.init_point) throw new Error("No se pudo iniciar el pago")

      toast({
        title: "Te llevamos a pagar",
        description: `${product.title} · ${formatPrice(total, product.currency)}`,
        duration: 2500,
      })

      window.location.href = response.data.init_point
    } catch (err) {
      toast({
        title: "No se pudo pagar",
        description:
          err instanceof Error
            ? translateClientError(err.message, tApi)
            : "Intentá de nuevo",
        variant: "destructive",
      })
      setPaying(false)
    }
  }

  const startCheckout = () => {
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/lives/${liveId}`)}`)
      return
    }
    setStep("shipping")
  }

  const subtitle = useMemo(() => {
    if (!product) return ""
    if (step === "shipping") return "Completá el envío para pagar con Mercado Pago"
    return hasDeal ? "Precio especial del vivo" : "Compra sin salir del vivo"
  }, [product, step, hasDeal])

  return (
    <Sheet open={open && Boolean(product)} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "z-[100] max-h-[92vh] overflow-y-auto rounded-t-3xl border-0 p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
        {product ? (
          <>
            <SheetHeader className="border-b border-servido-950/5 px-5 pb-3 pt-5 text-left">
              <SheetTitle className="text-lg text-servido-950">
                {step === "shipping" ? "Datos de envío" : "Comprar en el vivo"}
              </SheetTitle>
              <SheetDescription>{subtitle}</SheetDescription>
            </SheetHeader>

            {step === "summary" ? (
              <div className="space-y-4 px-5 py-4">
                <div className="flex gap-3">
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-servido-50">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-servido-700">
                        <ShoppingBag className="h-6 w-6" />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold text-servido-950">{product.title}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <p className="text-xl font-bold text-servido-900">
                        {formatPrice(unit, product.currency)}
                      </p>
                      {hasDeal ? (
                        <p className="text-sm text-slate-400 line-through">
                          {formatPrice(original, product.currency)}
                        </p>
                      ) : null}
                    </div>
                    {hasDeal ? (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">
                        Oferta del vivo
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-servido-50 px-3 py-2.5">
                  <span className="text-sm font-medium text-servido-950">Cantidad</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-servido-950 ring-1 ring-servido-950/10 disabled:opacity-40"
                      aria-label="Menos"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-base font-semibold">{quantity}</span>
                    <button
                      type="button"
                      disabled={quantity >= 20}
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-servido-950 ring-1 ring-servido-950/10 disabled:opacity-40"
                      aria-label="Más"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="text-lg font-bold text-servido-950">
                    {formatPrice(total, product.currency)}
                  </span>
                </div>

                <Button
                  type="button"
                  className="w-full rounded-full bg-red-600 py-6 text-base font-bold hover:bg-red-700"
                  onClick={startCheckout}
                >
                  Continuar al pago
                </Button>
                <p className="text-center text-[11px] text-slate-500">
                  Vas a pagar con Mercado Pago. Después podés volver al vivo.
                </p>
              </div>
            ) : (
              <div className="px-3 py-3">
                <ShippingForm
                  loading={paying}
                  onCancel={() => {
                    if (!paying) setStep("summary")
                  }}
                  onSubmit={(address) => void goPay(address)}
                />
                {paying ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-servido-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando pago…
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
