import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { assertChatMessageAllowed } from "@/lib/chat-content-guard"

export async function startVehicleListingChat(params: {
  listingId: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  vehicleTitle: string
  vehicleThumbnail?: string | null
  initialMessage: string
}): Promise<string> {
  if (params.buyerId === params.sellerId) {
    throw new Error("VEHICLE_CHAT_SELF")
  }

  const text = params.initialMessage.trim()
  if (!text) throw new Error("VEHICLE_CHAT_EMPTY")
  assertChatMessageAllowed(text)

  const chatId = `vehicle_${params.listingId}_${params.buyerId}`
  const chatRef = doc(db, "chats", chatId)
  const existing = await getDoc(chatRef)
  const participantIds = [params.buyerId, params.sellerId]

  const chatPayload = {
    type: "vehicle" as const,
    vehicleListingId: params.listingId,
    productName: params.vehicleTitle,
    buyerId: params.buyerId,
    sellerId: params.sellerId,
    buyerName: params.buyerName,
    sellerName: params.sellerName,
    participantIds,
    vehicleThumbnail: params.vehicleThumbnail || null,
    lastMessage: text,
    lastMessageSenderId: params.buyerId,
    lastMessageTimestamp: serverTimestamp(),
    deletedBy: [] as string[],
  }

  if (existing.exists()) {
    const data = existing.data()
    const deletedBy = Array.isArray(data.deletedBy) ? data.deletedBy : []
    await updateDoc(chatRef, {
      ...chatPayload,
      ...(deletedBy.length > 0 ? { deletedBy: [] } : {}),
    })
  } else {
    await setDoc(chatRef, {
      ...chatPayload,
      createdAt: serverTimestamp(),
    })
  }

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: params.buyerId,
    senderName: params.buyerName,
    text,
    timestamp: serverTimestamp(),
    source: "vehicle_inquiry",
    vehicleListingId: params.listingId,
  })

  return chatId
}
