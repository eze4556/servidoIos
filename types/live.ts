/** Lives nativos (MVP) — solo tiendas de productos/servicios. */

export type LiveStatus = "live" | "ended"

export interface LivePinnedProduct {
  productId: string
  title: string
  price: number
  imageUrl?: string | null
  currency?: string
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
  pinnedProduct?: LivePinnedProduct | null
  startedAt: Date
  endedAt?: Date | null
  /** Notificación a seguidores ya disparada (anti-spam). */
  followersNotifiedAt?: Date | null
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
