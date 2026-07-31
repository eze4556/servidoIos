import type { AppNotification } from "@/types/notifications"
import { getNotificationBody } from "@/lib/notifications"

type TranslateFn = (key: string, values?: Record<string, string | number>) => string

function formatWhenFromIso(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const tag = locale === "pt-BR" ? "pt-BR" : "es-AR"
  return date.toLocaleString(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function enrichParams(
  raw: Record<string, unknown>,
  t: TranslateFn,
  locale: string
): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) continue
    if (typeof v === "string" || typeof v === "number") params[k] = v
  }

  const whenIso = params.whenIso
  if (typeof whenIso === "string" && whenIso) {
    params.when = formatWhenFromIso(whenIso, locale)
  }
  if (!params.when) {
    params.when = t("service.whenFallback")
  }

  const restaurantName = params.restaurantName
  params.place =
    typeof restaurantName === "string" && restaurantName.trim()
      ? t("foodOrder.placeSuffix", { restaurantName: restaurantName.trim() })
      : ""

  const buyerName = params.buyerName
  if (!buyerName || (typeof buyerName === "string" && !buyerName.trim())) {
    params.buyerName = t("service.defaultBuyerName")
  }

  const planLabel = params.planLabel
  params.planSuffix =
    typeof planLabel === "string" && planLabel.trim()
      ? t("subscription.planSuffix", { planLabel: planLabel.trim() })
      : ""

  return params
}

function resolveByI18nKey(
  i18nKey: string,
  rawParams: Record<string, unknown>,
  t: TranslateFn,
  locale: string
): { title: string; body: string } | null {
  const params = enrichParams(rawParams, t, locale)

  if (i18nKey.startsWith("foodOrder.")) {
    const title = t(`${i18nKey}.title`)
    params.title = title
    const body =
      i18nKey === "foodOrder.entregado"
        ? t(`${i18nKey}.body`, params)
        : t("foodOrder.genericBody", params)
    return { title, body }
  }

  if (i18nKey.startsWith("shipping.")) {
    const status = i18nKey.replace("shipping.", "")
    const title = t(`${i18nKey}.title`)
    const trackingNumber = String(params.trackingNumber || "").trim()
    const carrierName = String(params.carrierName || "").trim()
    let body: string
    if (status === "shipped" && trackingNumber) {
      body = t(`${i18nKey}.bodyWithTracking`, {
        productName: String(params.productName || ""),
        trackingNumber,
        carrierSuffix: carrierName ? t("shipping.carrierSuffix", { carrierName }) : "",
      })
    } else {
      body = t(`${i18nKey}.body`, { productName: String(params.productName || "") })
    }
    return { title, body }
  }

  if (i18nKey.startsWith("subscription.")) {
    return {
      title: t(`${i18nKey}.title`, params),
      body: t(`${i18nKey}.body`, params),
    }
  }

  if (i18nKey.startsWith("service.")) {
    return {
      title: t(`${i18nKey}.title`, params),
      body: t(`${i18nKey}.body`, params),
    }
  }

  return null
}

function legacyFoodOrder(
  meta: Record<string, unknown>,
  t: TranslateFn,
  locale: string
): { title: string; body: string } | null {
  const status = String(meta.status || "")
  if (!status) return null
  const key = `foodOrder.${status}`
  return resolveByI18nKey(key, { restaurantName: meta.restaurantName, status }, t, locale)
}

function legacySubscription(
  meta: Record<string, unknown>,
  t: TranslateFn,
  locale: string
): { title: string; body: string } | null {
  const days = meta.daysRemaining
  if (typeof days !== "number") return null
  const i18nKey = days <= 0 ? "subscription.expired" : days === 1 ? "subscription.tomorrow" : "subscription.days"
  return resolveByI18nKey(i18nKey, { days, planLabel: meta.planLabel || "" }, t, locale)
}

function legacyShipping(
  n: AppNotification,
  meta: Record<string, unknown>,
  t: TranslateFn,
  locale: string
): { title: string; body: string } | null {
  const status = String(meta.shippingStatus || (n as { shippingStatus?: string }).shippingStatus || "")
  if (!status) return null
  return resolveByI18nKey(
    `shipping.${status}`,
    {
      productName: meta.productName || (n as { productName?: string }).productName || "",
      trackingNumber: meta.trackingNumber || (n as { trackingNumber?: string }).trackingNumber || "",
      carrierName: meta.carrierName || (n as { carrierName?: string }).carrierName || "",
    },
    t,
    locale
  )
}

function legacyService(
  meta: Record<string, unknown>,
  t: TranslateFn,
  locale: string
): { title: string; body: string } | null {
  const status = String(meta.status || "")
  if (status && meta.appointmentId) {
    const resolved = resolveByI18nKey(
      `service.status.${status}`,
      {
        serviceName: meta.serviceName || "",
        whenIso: meta.whenIso || "",
      },
      t,
      locale
    )
    if (resolved) return resolved
  }
  return null
}

/** Resuelve título y cuerpo según locale del usuario (notificaciones guardadas con meta i18n). */
export function resolveAppNotificationDisplay(
  n: AppNotification,
  t: TranslateFn,
  locale: string
): { title: string; body: string } {
  const meta = (n.meta || {}) as Record<string, unknown>
  const i18nKey = typeof meta.i18nKey === "string" ? meta.i18nKey : ""
  const i18nParams = (meta.i18nParams || {}) as Record<string, unknown>

  if (i18nKey) {
    const resolved = resolveByI18nKey(i18nKey, i18nParams, t, locale)
    if (resolved) return resolved
  }

  if (n.type === "food_order") {
    const legacy = legacyFoodOrder(meta, t, locale)
    if (legacy) return legacy
  }
  if (n.type === "subscription") {
    const legacy = legacySubscription(meta, t, locale)
    if (legacy) return legacy
  }
  if (n.type === "shipping" || n.type === "centralized_shipping") {
    const legacy = legacyShipping(n, meta, t, locale)
    if (legacy) return legacy
  }
  if (n.type === "service") {
    const legacy = legacyService(meta, t, locale)
    if (legacy) return legacy
  }

  return { title: n.title, body: getNotificationBody(n) }
}
