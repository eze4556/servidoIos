import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import {
  SERVIDO_OFFICIAL_LOGO_PATH,
  SERVIDO_OFFICIAL_USER_ID,
  servidoChatIdForUser,
} from "@/lib/servido-official"

export async function sendServidoBroadcastChatMessage(params: {
  userId: string
  title: string
  body: string
  link?: string | null
  batchId: string
}): Promise<void> {
  const userId = String(params.userId || "").trim()
  const title = String(params.title || "").trim()
  const body = String(params.body || "").trim()
  if (!userId || !body) return

  const chatId = servidoChatIdForUser(userId)
  const messageId = `${params.batchId}_${userId}`.replace(/[/\\]/g, "_")
  const msgRef = db.collection("chats").doc(chatId).collection("messages").doc(messageId)
  const existingMsg = await msgRef.get()
  if (existingMsg.exists) return

  const preview = title ? `${title} — ${body}` : body
  const chatRef = db.collection("chats").doc(chatId)
  const chatSnap = await chatRef.get()

  const patch = {
    type: "servido",
    buyerId: userId,
    sellerId: SERVIDO_OFFICIAL_USER_ID,
    sellerName: "Servido",
    sellerPhotoURL: SERVIDO_OFFICIAL_LOGO_PATH,
    isOfficialServido: true,
    participantIds: [userId, SERVIDO_OFFICIAL_USER_ID],
    lastMessage: preview.slice(0, 500),
    lastMessageSenderId: SERVIDO_OFFICIAL_USER_ID,
    lastMessageTimestamp: FieldValue.serverTimestamp(),
    deletedBy: [],
  }

  if (chatSnap.exists) {
    await chatRef.update(patch)
  } else {
    await chatRef.set({
      ...patch,
      buyerName: "",
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  await msgRef.set({
    senderId: SERVIDO_OFFICIAL_USER_ID,
    senderName: "Servido",
    text: body,
    broadcastTitle: title || null,
    link: params.link ? String(params.link).trim() : null,
    source: "admin_broadcast",
    batchId: params.batchId,
    timestamp: FieldValue.serverTimestamp(),
  })
}
