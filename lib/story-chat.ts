import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Story } from "@/types/story"

export interface ChatListItem {
  id: string
  type?: "product" | "story"
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  productName?: string
  storyImageUrl?: string | null
  storyCaption?: string | null
  lastMessage?: string
  lastMessageTimestamp?: { toMillis?: () => number } | null
  lastMessageSenderId?: string | null
  deletedBy?: string[]
  participantIds?: string[]
  lastReadAt?: Record<string, unknown>
}

function sortChats(list: ChatListItem[]): ChatListItem[] {
  return [...list].sort((a, b) => {
    const ta = a.lastMessageTimestamp?.toMillis?.() || 0
    const tb = b.lastMessageTimestamp?.toMillis?.() || 0
    return tb - ta
  })
}

function isVisibleForUser(chat: ChatListItem, userId: string): boolean {
  return !(Array.isArray(chat.deletedBy) && chat.deletedBy.includes(userId))
}

/**
 * Un solo listener (array-contains). Evita el bug ca9 del SDK
 * con dos onSnapshot + unsub rápido (React Strict Mode / navegación).
 */
export function subscribeUserChats(
  userId: string,
  onChange: (chats: ChatListItem[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const q = query(collection(db, "chats"), where("participantIds", "array-contains", userId))
  let legacyLoaded = false
  const fromQuery = new Map<string, ChatListItem>()
  const fromLegacy = new Map<string, ChatListItem>()

  const emit = () => {
    const merged = new Map([...fromLegacy, ...fromQuery])
    onChange(sortChats(Array.from(merged.values()).filter((c) => isVisibleForUser(c, userId))))
  }

  return onSnapshot(
    q,
    (snap) => {
      fromQuery.clear()
      snap.docs.forEach((d) => fromQuery.set(d.id, { id: d.id, ...d.data() } as ChatListItem))
      emit()

      if (legacyLoaded) return
      legacyLoaded = true

      // Tras anclar el canal, una sola pasada para chats viejos sin participantIds
      void Promise.all([
        getDocs(query(collection(db, "chats"), where("buyerId", "==", userId))),
        getDocs(query(collection(db, "chats"), where("sellerId", "==", userId))),
      ])
        .then(([buyerSnap, sellerSnap]) => {
          for (const d of [...buyerSnap.docs, ...sellerSnap.docs]) {
            const row = { id: d.id, ...d.data() } as ChatListItem
            fromLegacy.set(d.id, row)
            if (
              (!Array.isArray(row.participantIds) || row.participantIds.length < 2) &&
              row.buyerId &&
              row.sellerId
            ) {
              void updateDoc(doc(db, "chats", d.id), {
                participantIds: [row.buyerId, row.sellerId],
              }).catch(() => undefined)
            }
          }
          emit()
        })
        .catch((err) => console.error("legacy chats:", err))
    },
    (err) => {
      console.error("subscribeUserChats:", err)
      onError?.(err)
    }
  )
}

/**
 * Envía un reply desde una historia (estilo Instagram).
 * Reusa el chat story_{storyId}_{viewerId} si ya existe.
 */
export async function replyToStory(params: {
  story: Story
  text: string
  senderId: string
  senderName: string
}): Promise<string> {
  const text = params.text.trim()
  if (!text) throw new Error("Escribí un mensaje")
  if (params.senderId === params.story.authorId) {
    throw new Error("No podés responderte a vos mismo")
  }

  const chatId = `story_${params.story.id}_${params.senderId}`
  const chatRef = doc(db, "chats", chatId)
  const existing = await getDoc(chatRef)
  const participantIds = [params.senderId, params.story.authorId]

  if (existing.exists()) {
    const data = existing.data()
    const deletedBy = Array.isArray(data.deletedBy) ? data.deletedBy : []
    await updateDoc(chatRef, {
      ...(deletedBy.length > 0 ? { deletedBy: [] } : {}),
      participantIds,
      lastMessage: text,
      lastMessageSenderId: params.senderId,
      lastMessageTimestamp: serverTimestamp(),
    })
  } else {
    await setDoc(chatRef, {
      type: "story",
      storyId: params.story.id,
      buyerId: params.senderId,
      sellerId: params.story.authorId,
      buyerName: params.senderName,
      sellerName: params.story.authorName,
      participantIds,
      storyImageUrl: params.story.imageUrl || null,
      storyCaption: params.story.caption || null,
      lastMessage: text,
      lastMessageSenderId: params.senderId,
      lastMessageTimestamp: serverTimestamp(),
      deletedBy: [],
      createdAt: serverTimestamp(),
    })
  }

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: params.senderId,
    senderName: params.senderName,
    text,
    timestamp: serverTimestamp(),
    source: "story_reply",
    storyId: params.story.id,
  })

  return chatId
}

/** Soft-delete: el chat deja de verse para este usuario */
export async function hideChatForUser(chatId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    deletedBy: arrayUnion(userId),
  })
}
