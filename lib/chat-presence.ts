import { doc, onSnapshot, serverTimestamp, updateDoc, type Unsubscribe } from "firebase/firestore"
import { db } from "@/lib/firebase"

const ONLINE_MS = 60_000

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (value instanceof Date) return value.getTime()
  return 0
}

export function formatLastSeen(lastSeenAt: unknown, now = Date.now()): string {
  const ms = toMillis(lastSeenAt)
  if (!ms) return "última vez desconocida"
  const diff = Math.max(0, now - ms)
  if (diff < ONLINE_MS) return "en línea"
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "última vez hace un momento"
  if (mins < 60) return `última vez hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `última vez hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "última vez ayer"
  if (days < 7) return `última vez hace ${days} días`
  return `última vez el ${new Date(ms).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  })}`
}

export function isUserOnline(lastSeenAt: unknown, now = Date.now()): boolean {
  const ms = toMillis(lastSeenAt)
  return ms > 0 && now - ms < ONLINE_MS
}

/** Actualiza lastSeenAt del usuario (heartbeat de presencia). */
export async function touchUserPresence(userId: string): Promise<void> {
  if (!userId) return
  try {
    await updateDoc(doc(db, "users", userId), {
      lastSeenAt: serverTimestamp(),
    })
  } catch {
    // si el doc no permite write o no existe, ignorar
  }
}

export function subscribeUserPresence(
  userId: string,
  onChange: (lastSeenAt: unknown) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", userId),
    (snap) => {
      onChange(snap.exists() ? snap.data().lastSeenAt : null)
    },
    () => onChange(null)
  )
}

/** Marca el chat como leído por este usuario. */
export async function markChatRead(chatId: string, userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "chats", chatId), {
      [`lastReadAt.${userId}`]: serverTimestamp(),
    })
  } catch {
    // ignore
  }
}

export function getOtherLastReadMs(
  lastReadAt: Record<string, unknown> | undefined,
  otherUserId: string
): number {
  if (!lastReadAt) return 0
  return toMillis(lastReadAt[otherUserId])
}

export function isMessageSeen(
  message: { senderId: string; timestamp?: unknown },
  myUid: string,
  otherLastReadMs: number
): boolean {
  if (message.senderId !== myUid) return false
  const msgMs = toMillis(message.timestamp)
  if (!msgMs || !otherLastReadMs) return false
  return otherLastReadMs >= msgMs - 500
}

/** Beep corto al recibir mensaje (Web Audio, sin archivo). */
export function playIncomingMessageSound(): void {
  if (typeof window === "undefined") return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    window.setTimeout(() => void ctx.close(), 400)
  } catch {
    // autoplay bloqueado / sin audio
  }
}
