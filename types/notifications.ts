export type AppNotificationType =
  | "shipping"
  | "centralized_shipping"
  | "subscription"
  | "food_order"
  | "service"
  | "payment"
  | "promo"
  | "system"

export interface AppNotification {
  id: string
  userId: string
  type: AppNotificationType | string
  title: string
  /** Texto principal (también se guarda como description por compat) */
  body: string
  description?: string
  link?: string | null
  read?: boolean
  isRead?: boolean
  createdAt?: any
  /** Clave para no duplicar el mismo aviso (ej. subscription_reminder_uid_2026-07-21) */
  dedupeKey?: string | null
  meta?: Record<string, unknown> | null
}

export type CreateAppNotificationInput = {
  userId: string
  type: AppNotificationType | string
  title: string
  body: string
  link?: string | null
  dedupeKey?: string | null
  meta?: Record<string, unknown> | null
}
