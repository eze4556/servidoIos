import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export type ChatListingPayload = {
  listingKind: "product"
  listingId: string
  listingTitle: string
  listingImageUrl: string | null
  listingPrice: number | null
  sellerId: string | null
}

export async function fetchProductListingForChat(productId: string): Promise<ChatListingPayload | null> {
  const snap = await getDoc(doc(db, "products", productId))
  if (!snap.exists()) return null
  const data = snap.data()
  const media = Array.isArray(data.media) ? data.media : []
  const imageUrl =
    (media[0]?.url as string | undefined) ||
    (data.imageUrl as string | undefined) ||
    null
  return {
    listingKind: "product",
    listingId: snap.id,
    listingTitle: String(data.name || "Producto"),
    listingImageUrl: imageUrl,
    listingPrice: typeof data.price === "number" ? data.price : Number(data.price) || null,
    sellerId: typeof data.sellerId === "string" ? data.sellerId : null,
  }
}
