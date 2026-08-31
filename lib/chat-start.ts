import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { assertChatMessageAllowed } from "@/lib/chat-content-guard"
import { notifyChatMessage } from "@/lib/chat-notifications"

export async function startProductListingChat(params: {
  productId: string
  productName: string
  productImageUrl?: string | null
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  initialMessage?: string
}): Promise<string> {
  if (params.buyerId === params.sellerId) throw new Error("PRODUCT_CHAT_SELF")
  const text = (params.initialMessage || "¡Hola! Me interesa este producto.").trim()
  assertChatMessageAllowed(text)

  const existing = await getDocs(
    query(collection(db, "chats"), where("productId", "==", params.productId), limit(50))
  )
  const previous = existing.docs.find((chatDoc) => {
    const data = chatDoc.data()
    return data.buyerId === params.buyerId && data.sellerId === params.sellerId
  })
  if (previous) return previous.id

  const chatRef = await addDoc(collection(db, "chats"), {
    type: "product",
    productId: params.productId,
    productName: params.productName,
    productImageUrl: params.productImageUrl || null,
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    sellerId: params.sellerId,
    sellerName: params.sellerName,
    participantIds: [params.buyerId, params.sellerId],
    lastMessage: text,
    lastMessageSenderId: params.buyerId,
    lastMessageTimestamp: serverTimestamp(),
    deletedBy: [],
    createdAt: serverTimestamp(),
  })
  const messageRef = await addDoc(collection(db, "chats", chatRef.id, "messages"), {
    senderId: params.buyerId,
    senderName: params.buyerName,
    text,
    messageType: "text",
    timestamp: serverTimestamp(),
  })
  void notifyChatMessage({
    chatId: chatRef.id,
    messageId: messageRef.id,
    recipientId: params.sellerId,
    senderName: params.buyerName,
    preview: text,
  })
  return chatRef.id
}

export async function startSellerChat(params: {
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
}): Promise<string> {
  if (params.buyerId === params.sellerId) throw new Error("SELLER_CHAT_SELF")
  const chatId = `seller_${params.sellerId}_${params.buyerId}`
  const chatRef = doc(db, "chats", chatId)
  const existing = await getDoc(chatRef)
  if (existing.exists()) return chatId

  const text = "¡Hola! Quisiera hacerte una consulta."
  await setDoc(chatRef, {
    type: "seller",
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    sellerId: params.sellerId,
    sellerName: params.sellerName,
    participantIds: [params.buyerId, params.sellerId],
    lastMessage: text,
    lastMessageSenderId: params.buyerId,
    lastMessageTimestamp: serverTimestamp(),
    deletedBy: [],
    createdAt: serverTimestamp(),
  })
  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: params.buyerId,
    senderName: params.buyerName,
    text,
    messageType: "text",
    timestamp: serverTimestamp(),
  })
  void notifyChatMessage({
    chatId,
    messageId: messageRef.id,
    recipientId: params.sellerId,
    senderName: params.buyerName,
    preview: text,
  })
  return chatId
}

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

  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: params.buyerId,
    senderName: params.buyerName,
    text,
    timestamp: serverTimestamp(),
    source: "vehicle_inquiry",
    vehicleListingId: params.listingId,
  })

  void notifyChatMessage({
    chatId,
    messageId: messageRef.id,
    recipientId: params.sellerId,
    senderName: params.buyerName,
    preview: text,
  })

  return chatId
}

export async function startPropertyListingChat(params: {
  listingId: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  propertyTitle: string
  propertyThumbnail?: string | null
  initialMessage: string
}): Promise<string> {
  if (params.buyerId === params.sellerId) {
    throw new Error("PROPERTY_CHAT_SELF")
  }

  const text = params.initialMessage.trim()
  if (!text) throw new Error("PROPERTY_CHAT_EMPTY")
  assertChatMessageAllowed(text)

  const chatId = `property_${params.listingId}_${params.buyerId}`
  const chatRef = doc(db, "chats", chatId)
  const existing = await getDoc(chatRef)
  const participantIds = [params.buyerId, params.sellerId]

  const chatPayload = {
    type: "property" as const,
    propertyListingId: params.listingId,
    productName: params.propertyTitle,
    buyerId: params.buyerId,
    sellerId: params.sellerId,
    buyerName: params.buyerName,
    sellerName: params.sellerName,
    participantIds,
    propertyThumbnail: params.propertyThumbnail || null,
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

  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: params.buyerId,
    senderName: params.buyerName,
    text,
    timestamp: serverTimestamp(),
    source: "property_inquiry",
    propertyListingId: params.listingId,
  })

  void notifyChatMessage({
    chatId,
    messageId: messageRef.id,
    recipientId: params.sellerId,
    senderName: params.buyerName,
    preview: text,
  })

  return chatId
}
