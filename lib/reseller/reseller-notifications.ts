import { createNotificationAdmin } from "@/lib/notifications-server"
import {
  RESELLER_COMMISSION_ARS,
  RESELLER_UNITS_PAYOUT_THRESHOLD,
} from "@/types/reseller"

const RESELLER_PANEL_LINK = "/dashboard/buyer?tab=reseller"

function formatArs(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

export type ResellerNotificationIntent =
  | {
      kind: "batch_ready"
      referrerUserId: string
      amount: number
      units: number
      purchaseId: string
      batchIndex: number
    }
  | { kind: "almost_threshold"; referrerUserId: string; salesLeft: number }

export async function sendResellerNotifications(intents: ResellerNotificationIntent[]): Promise<void> {
  for (const intent of intents) {
    try {
      if (intent.kind === "batch_ready") {
        await createNotificationAdmin({
          userId: intent.referrerUserId,
          type: "reseller",
          title: "¡Llegaste a 25 ventas!",
          body: `Tenés ${formatArs(intent.amount)} listos para cobrar (${intent.units} unidades). Servido procesará tu transferencia.`,
          link: RESELLER_PANEL_LINK,
          dedupeKey: `reseller_batch_${intent.purchaseId}_${intent.batchIndex}`,
        })
      } else if (intent.kind === "almost_threshold") {
        await createNotificationAdmin({
          userId: intent.referrerUserId,
          type: "reseller",
          title: "¡Casi llegás al cobro!",
          body:
            intent.salesLeft === 1
              ? "Te falta 1 venta más con tu link para generar un lote de cobro."
              : `Te faltan ${intent.salesLeft} ventas con tu link para poder cobrar.`,
          link: RESELLER_PANEL_LINK,
          dedupeKey: `reseller_almost_${intent.referrerUserId}_${intent.salesLeft}`,
        })
      }
    } catch (err) {
      console.error("sendResellerNotifications failed:", intent, err)
    }
  }
}

export async function notifyResellerPayoutPaid(params: {
  referrerUserId: string
  amount: number
  batchId: string
}): Promise<void> {
  const { referrerUserId, amount, batchId } = params
  await createNotificationAdmin({
    userId: referrerUserId,
    type: "reseller",
    title: "Transferencia registrada",
    body: `Servido marcó como pagado tu cobro de ${formatArs(amount)}.`,
    link: RESELLER_PANEL_LINK,
    dedupeKey: `reseller_paid_${batchId}`,
  })
}

export function batchReadyIntent(
  referrerUserId: string,
  purchaseId: string,
  batchIndex: number
): ResellerNotificationIntent {
  const units = RESELLER_UNITS_PAYOUT_THRESHOLD
  return {
    kind: "batch_ready",
    referrerUserId,
    amount: units * RESELLER_COMMISSION_ARS,
    units,
    purchaseId,
    batchIndex,
  }
}
