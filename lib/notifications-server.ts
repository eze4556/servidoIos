import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"

export type ServerNotificationInput = {
  userId: string
  type: string
  title: string
  body: string
  link?: string | null
  dedupeKey?: string | null
  meta?: Record<string, unknown> | null
}

export async function createNotificationAdmin(input: ServerNotificationInput): Promise<string> {
  const userId = String(input.userId || "").trim()
  const title = String(input.title || "").trim()
  const body = String(input.body || "").trim()
  if (!userId || !title || !body) {
    throw new Error("Notificación incompleta")
  }

  const dedupeKey = input.dedupeKey ? String(input.dedupeKey).trim() : ""
  if (dedupeKey) {
    const existing = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .where("dedupeKey", "==", dedupeKey)
      .limit(1)
      .get()
    if (!existing.empty) return existing.docs[0].id
  }

  const ref = await db.collection("notifications").add({
    userId,
    type: input.type || "system",
    title,
    body,
    description: body,
    link: input.link || null,
    read: false,
    isRead: false,
    dedupeKey: dedupeKey || null,
    meta: input.meta || null,
    createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}
