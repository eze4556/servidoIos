import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { FoodOrder } from "@/types/restaurant"

/** Chat dedicado comprador ↔ cadete por pedido de comida. */
export function getDeliveryChatId(foodOrderId: string): string {
  return `delivery_${foodOrderId}`
}

export async function ensureDeliveryChatForOrder(order: FoodOrder): Promise<string> {
  const cadeteId = order.cadeteId
  if (!cadeteId || !order.buyerId) {
    throw new Error("Faltan comprador o cadete para abrir el chat.")
  }

  const chatId = getDeliveryChatId(order.id)
  const chatRef = doc(db, "chats", chatId)
  const existing = await getDoc(chatRef)

  const payload = {
    type: "delivery" as const,
    foodOrderId: order.id,
    buyerId: order.buyerId,
    sellerId: cadeteId,
    buyerName: order.buyerEmail?.split("@")[0] || "Comprador",
    sellerName: order.cadeteName || "Cadete",
    participantIds: [order.buyerId, cadeteId],
    restaurantName: order.restaurantName,
    lastMessage: "Chat de entrega abierto",
    lastMessageTimestamp: serverTimestamp(),
    deletedBy: [] as string[],
  }

  if (existing.exists()) {
    await updateDoc(chatRef, {
      participantIds: payload.participantIds,
      sellerId: cadeteId,
      sellerName: payload.sellerName,
      deletedBy: [],
    })
  } else {
    await setDoc(chatRef, {
      ...payload,
      createdAt: serverTimestamp(),
    })
  }

  return chatId
}
