"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ApiService } from "@/lib/services/api"
import { formatPriceNumber } from "@/lib/utils"
import { Loader2, CreditCard } from "lucide-react"

const CHECKOUT_SESSION_KEY = "servido_checkout_session"

export function saveCheckoutSessionId(sessionId: string) {
  try {
    sessionStorage.setItem(CHECKOUT_SESSION_KEY, sessionId)
  } catch {
    // ignore
  }
}

export function readCheckoutSessionId(): string | null {
  try {
    return sessionStorage.getItem(CHECKOUT_SESSION_KEY)
  } catch {
    return null
  }
}

export function clearCheckoutSessionId() {
  try {
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY)
  } catch {
    // ignore
  }
}

type Props = {
  sessionId?: string | null
  currentPurchaseId?: string | null
  variant?: "success" | "failure" | "pending"
}

export function MultiSellerCheckoutContinue({
  sessionId,
  currentPurchaseId,
  variant = "success",
}: Props) {
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [error, setError] = useState<string | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [nextPayment, setNextPayment] = useState<{
    sellerName: string
    amount: number
    init_point: string | null
  } | null>(null)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const response = await ApiService.getCheckoutSession(sessionId)
        if (response.error || !response.data) {
          throw new Error(response.error || "No se pudo cargar el checkout")
        }

        if (cancelled) return

        const data = response.data
        const payments = [...(data.payments || [])].map((p) => {
          if (
            variant === "success" &&
            currentPurchaseId &&
            p.purchaseId === currentPurchaseId &&
            p.status === "pending"
          ) {
            return { ...p, status: "approved" }
          }
          return p
        })

        const total = payments.length
        const completed = payments.filter((p) => p.status === "approved").length
        setTotalCount(total)
        setCompletedCount(completed)

        const next =
          payments.find((p) => p.status === "pending" && p.init_point) ||
          payments.find((p) => p.status === "pending") ||
          null

        if (next?.init_point) {
          setNextPayment({
            sellerName: next.sellerName || "vendedor",
            amount: next.amount || 0,
            init_point: next.init_point,
          })
          setAllDone(false)
          saveCheckoutSessionId(sessionId)
        } else if (completed >= total && total > 0) {
          setAllDone(true)
          setNextPayment(null)
          clearCheckoutSessionId()
        } else {
          setNextPayment(null)
          setAllDone(completed > 0 && !next)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al continuar el checkout")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionId, currentPurchaseId, variant])

  if (!sessionId) return null

  if (loading) {
    return (
      <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Revisando pagos de tu compra...
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {error}
      </div>
    )
  }

  if (allDone) {
    return (
      <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Completaste los {totalCount} pagos de esta compra.
      </div>
    )
  }

  if (!nextPayment?.init_point) {
    if (variant === "failure") {
      return (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left text-sm text-red-800">
          <p className="font-medium">Este pago no se completó.</p>
          <p className="mt-1">
            Los pagos de otros vendedores que ya aprobaste siguen válidos. Podés reintentar este
            pago desde el carrito o más tarde.
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 p-4 text-left text-sm text-sky-900">
      <p className="font-semibold">
        Tu compra tiene {totalCount} vendedor{totalCount === 1 ? "" : "es"}. Vas a realizar{" "}
        {totalCount} pago{totalCount === 1 ? "" : "s"}.
      </p>
      <p className="mt-1 text-sky-800">
        Progreso: {completedCount} de {totalCount} pagados.
        {variant === "success" ? " Este pago quedó registrado." : null}
        {variant === "pending" ? " Este pago quedó pendiente." : null}
        {variant === "failure" ? " Este pago no se completó; podés continuar con el siguiente o reintentar." : null}
      </p>
      <p className="mt-3 text-sky-800">
        Siguiente: <strong>{nextPayment.sellerName}</strong> —{" "}
        {formatPriceNumber(nextPayment.amount)}
      </p>
      <Button
        className="mt-4 w-full bg-sky-700 hover:bg-sky-800"
        onClick={() => {
          if (nextPayment.init_point) window.location.href = nextPayment.init_point
        }}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Continuar con el siguiente pago
      </Button>
    </div>
  )
}
