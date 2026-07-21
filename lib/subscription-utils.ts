export type SubscriptionStatus = "active" | "inactive" | "cancelled"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface SubscriptionSnapshot {
  status: SubscriptionStatus
  endsAt: Date | null
  daysRemaining: number | null
  isExpired: boolean
  /** Baja pedida: sigue con acceso hasta endsAt, no se renueva */
  cancelAtPeriodEnd: boolean
}

export function normalizeSubscriptionDate(value: unknown): Date | null {
  if (!value) return null

  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  return null
}

function readSubscriptionEndDate(userData: any): Date | null {
  return normalizeSubscriptionDate(userData?.subscription?.endDate ?? userData?.subscriptionEndsAt ?? userData?.subscriptionEndDate)
}

export function getSubscriptionSnapshot(userData: any, now: Date = new Date()): SubscriptionSnapshot {
  const endsAt = readSubscriptionEndDate(userData)
  const rawStatus = userData?.subscription_status ?? userData?.subscription?.status
  const cancelAtPeriodEnd = Boolean(userData?.subscription?.cancelAtPeriodEnd)
  const remainingMilliseconds = endsAt ? endsAt.getTime() - now.getTime() : null
  const isExpired = remainingMilliseconds !== null ? remainingMilliseconds <= 0 : false
  const daysRemaining = endsAt
    ? isExpired
      ? 0
      : Math.max(1, Math.ceil(remainingMilliseconds / MS_PER_DAY))
    : null

  let status: SubscriptionStatus
  if (rawStatus === "inactive") {
    status = "inactive"
  } else if (isExpired) {
    // Período pagado terminó (incluye bajas programadas)
    status = rawStatus === "cancelled" || cancelAtPeriodEnd ? "cancelled" : "inactive"
  } else if (rawStatus === "cancelled" && endsAt && !isExpired) {
    // Canceló pero todavía le queda tiempo del mes pagado → sigue operando
    status = "active"
  } else if (rawStatus === "active" || userData?.isSubscribed) {
    status = "active"
  } else if (rawStatus === "cancelled") {
    status = "cancelled"
  } else {
    status = "inactive"
  }

  return {
    status,
    endsAt,
    daysRemaining,
    isExpired,
    cancelAtPeriodEnd: cancelAtPeriodEnd && status === "active",
  }
}

