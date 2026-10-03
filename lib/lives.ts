import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type {
  LiveChatMessage,
  LiveMetrics,
  LivePinnedProduct,
  LiveSession,
  LiveStatus,
} from "@/types/live"
import { API_BASE } from "@/lib/api-base"
import { auth } from "@/lib/firebase"

function toDate(value: unknown): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(value as string | number)
}

function mapPinned(raw: unknown): LivePinnedProduct | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Record<string, unknown>
  const productId = String(p.productId || "")
  if (!productId) return null
  const price = Number(p.price) || 0
  const originalRaw = Number(p.originalPrice)
  return {
    productId,
    title: String(p.title || "Producto"),
    price,
    originalPrice: Number.isFinite(originalRaw) && originalRaw > 0 ? originalRaw : price,
    imageUrl: (p.imageUrl as string | null | undefined) ?? null,
    currency: String(p.currency || "ARS"),
    category: (p.category as string | null | undefined) ?? null,
  }
}

function mapPinnedList(
  listRaw: unknown,
  fallback: unknown
): LivePinnedProduct[] {
  const source = Array.isArray(listRaw) ? listRaw : fallback ? [fallback] : []
  const out: LivePinnedProduct[] = []
  for (const item of source) {
    const mapped = mapPinned(item)
    if (!mapped) continue
    if (out.some((p) => p.productId === mapped.productId)) continue
    out.push(mapped)
  }
  return out
}

export function mapLiveSession(id: string, data: Record<string, unknown>): LiveSession {
  const pinnedProducts = mapPinnedList(data.pinnedProducts, data.pinnedProduct)
  const pinnedProduct =
    mapPinned(data.pinnedProduct) || pinnedProducts[0] || null
  return {
    id,
    sellerId: String(data.sellerId || ""),
    sellerName: String(data.sellerName || "Tienda"),
    sellerPhotoURL: (data.sellerPhotoURL as string | null | undefined) ?? null,
    roomName: String(data.roomName || id),
    title: String(data.title || "En vivo"),
    status: (data.status as LiveStatus) || "ended",
    viewerCount: Number(data.viewerCount) || 0,
    peakViewerCount: Number(data.peakViewerCount) || 0,
    buyClickCount: Number(data.buyClickCount) || 0,
    chatMessageCount: Number(data.chatMessageCount) || 0,
    pinnedProduct,
    pinnedProducts,
    startedAt: toDate(data.startedAt),
    endedAt: data.endedAt ? toDate(data.endedAt) : null,
    followersNotifiedAt: data.followersNotifiedAt ? toDate(data.followersNotifiedAt) : null,
    followersNotifiedCount: Number(data.followersNotifiedCount) || 0,
    metrics: mapLiveMetrics(data.metrics),
  }
}

function mapLiveMetrics(raw: unknown): LiveMetrics | null {
  if (!raw || typeof raw !== "object") return null
  const m = raw as Record<string, unknown>
  return {
    durationSeconds: Math.max(0, Math.floor(Number(m.durationSeconds) || 0)),
    peakViewerCount: Math.max(0, Math.floor(Number(m.peakViewerCount) || 0)),
    chatMessageCount: Math.max(0, Math.floor(Number(m.chatMessageCount) || 0)),
    buyClickCount: Math.max(0, Math.floor(Number(m.buyClickCount) || 0)),
    followersNotifiedCount: Math.max(0, Math.floor(Number(m.followersNotifiedCount) || 0)),
  }
}

export function mapLiveChatMessage(id: string, data: Record<string, unknown>): LiveChatMessage {
  return {
    id,
    liveId: String(data.liveId || ""),
    userId: String(data.userId || ""),
    userName: String(data.userName || "Usuario"),
    userPhotoURL: (data.userPhotoURL as string | null | undefined) ?? null,
    text: String(data.text || ""),
    createdAt: toDate(data.createdAt),
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser
  if (!user) throw new Error("Tenés que iniciar sesión")
  const token = await user.getIdToken(true)
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

export async function listActiveLives(max = 30): Promise<LiveSession[]> {
  const q = query(
    collection(db, "lives"),
    where("status", "==", "live"),
    orderBy("startedAt", "desc"),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapLiveSession(d.id, d.data() as Record<string, unknown>))
}

export async function getLiveSession(liveId: string): Promise<LiveSession | null> {
  const snap = await getDoc(doc(db, "lives", liveId))
  if (!snap.exists()) return null
  return mapLiveSession(snap.id, snap.data() as Record<string, unknown>)
}

export function subscribeLiveSession(
  liveId: string,
  onData: (live: LiveSession | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "lives", liveId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(mapLiveSession(snap.id, snap.data() as Record<string, unknown>))
    },
    (err) => onError?.(err)
  )
}

export function subscribeActiveLives(
  onData: (lives: LiveSession[]) => void,
  onError?: (err: Error) => void,
  max = 30
): Unsubscribe {
  const q = query(
    collection(db, "lives"),
    where("status", "==", "live"),
    orderBy("startedAt", "desc"),
    limit(max)
  )
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapLiveSession(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => onError?.(err)
  )
}

export function subscribeLiveChat(
  liveId: string,
  onData: (messages: LiveChatMessage[]) => void,
  onError?: (err: Error) => void,
  max = 80
): Unsubscribe {
  const q = query(
    collection(db, "lives", liveId, "messages"),
    orderBy("createdAt", "desc"),
    limit(max)
  )
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs
        .map((d) => mapLiveChatMessage(d.id, d.data() as Record<string, unknown>))
        .reverse()
      onData(msgs)
    },
    (err) => onError?.(err)
  )
}

export async function startLiveApi(title: string): Promise<{
  liveId: string
  roomName: string
  token: string
  serverUrl: string
}> {
  const res = await fetch(`${API_BASE}/api/lives/start`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ title }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo iniciar el vivo")
  return data
}

export async function endLiveApi(liveId: string): Promise<{
  ok: boolean
  alreadyEnded?: boolean
  metrics: LiveMetrics
}> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/end`, {
    method: "POST",
    headers: await authHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo finalizar el vivo")
  return data
}

/** Registra un clic en “Comprar ahora” (best-effort). */
export async function reportLiveBuyClickApi(
  liveId: string,
  productId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/buy-click`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ productId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "No se pudo registrar el clic")
  }
}

export async function pinProductApi(
  liveId: string,
  productId: string | null,
  action: "add" | "remove" | "focus" | "clear" | "setPrice" = "add",
  options?: { price?: number }
): Promise<{ pinnedProduct: LivePinnedProduct | null; pinnedProducts: LivePinnedProduct[] }> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/pin`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      productId,
      action: productId === null ? "clear" : action,
      ...(typeof options?.price === "number" ? { price: options.price } : {}),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo fijar el producto")
  return {
    pinnedProduct: (data.pinnedProduct as LivePinnedProduct | null) ?? null,
    pinnedProducts: Array.isArray(data.pinnedProducts)
      ? (data.pinnedProducts as LivePinnedProduct[])
      : data.pinnedProduct
        ? [data.pinnedProduct as LivePinnedProduct]
        : [],
  }
}

export async function reportViewerCountApi(liveId: string, viewerCount: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/viewers`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ viewerCount }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "No se pudo actualizar espectadores")
  }
}

export async function getLiveTokenApi(liveId: string): Promise<{
  token: string
  serverUrl: string
  roomName: string
  canPublish: boolean
}> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/token`, {
    method: "POST",
    headers: await authHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo obtener acceso al vivo")
  return data
}

/** Token solo-suscripción para el thumb del rail (no cuenta como viewer). */
export async function getLivePreviewTokenApi(liveId: string): Promise<{
  token: string
  serverUrl: string
  roomName: string
}> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/token`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ preview: true }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo obtener preview")
  return data
}

export async function sendLiveChatApi(liveId: string, text: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/lives/${encodeURIComponent(liveId)}/chat`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ text }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje")
}

export async function getSellerActiveLive(sellerId: string): Promise<LiveSession | null> {
  const q = query(
    collection(db, "lives"),
    where("sellerId", "==", sellerId),
    where("status", "==", "live"),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return mapLiveSession(d.id, d.data() as Record<string, unknown>)
}
