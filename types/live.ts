/** Lives nativos (MVP) — solo tiendas de productos/servicios. */

export type LiveStatus = "live" | "ended"

export interface LivePinnedProduct {
  productId: string
  title: string
  /** Precio vigente en el vivo (puede ser oferta especial). */
  price: number
  /** Precio de catálogo al momento de fijar (para tachado). */
  originalPrice?: number
  imageUrl?: string | null
  currency?: string
  category?: string | null
}

/** Resumen al cerrar el vivo (host). */
export interface LiveMetrics {
  durationSeconds: number
  peakViewerCount: number
  chatMessageCount: number
  buyClickCount: number
  followersNotifiedCount: number
}

export interface LiveSession {
  id: string
  sellerId: string
  sellerName: string
  sellerPhotoURL?: string | null
  /** Nombre de sala LiveKit (= id del doc por simplicidad). */
  roomName: string
  title: string
  status: LiveStatus
  viewerCount: number
  /** Pico máximo de espectadores en esta transmisión. */
  peakViewerCount?: number
  /** Clics en “Comprar ahora” durante el vivo. */
  buyClickCount?: number
  /** Mensajes de chat enviados. */
  chatMessageCount?: number
  /** Producto destacado (compat + foco del carousel). */
  pinnedProduct?: LivePinnedProduct | null
  /** Hasta LIVE_PINNED_MAX productos en el carousel. */
  pinnedProducts?: LivePinnedProduct[]
  startedAt: Date
  endedAt?: Date | null
  /** Notificación a seguidores ya disparada (anti-spam). */
  followersNotifiedAt?: Date | null
  /** Cantidad de seguidores avisados (push + in-app). */
  followersNotifiedCount?: number
  /** Snapshot de métricas al terminar. */
  metrics?: LiveMetrics | null
}

export interface LiveChatMessage {
  id: string
  liveId: string
  userId: string
  userName: string
  userPhotoURL?: string | null
  text: string
  createdAt: Date
}

export const LIVE_CHAT_MAX_LEN = 120
export const LIVE_CHAT_MIN_INTERVAL_MS = 1500
export const LIVE_TITLE_MAX_LEN = 80
export const LIVE_PINNED_MAX = 8

/** Identity LiveKit de preview en el rail (no cuenta como espectador). */
export const LIVE_PREVIEW_IDENTITY_PREFIX = "preview:"

export function isLivePreviewIdentity(identity: string): boolean {
  return identity.startsWith(LIVE_PREVIEW_IDENTITY_PREFIX)
}

export function livePreviewIdentity(uid: string): string {
  return `${LIVE_PREVIEW_IDENTITY_PREFIX}${uid}`
}

/** Plantillas rápidas para el título del vivo (host). */
export const LIVE_TITLE_TEMPLATES = [
  "Oferta del día",
  "Novedades",
  "Descuentos en vivo",
  "Preguntas y respuestas",
  "Últimas unidades",
  "Lanzamiento",
  "Todo a mitad de precio",
  "Miralo antes de que se agote",
] as const

