import { db as adminDb } from "@/lib/firebase-admin"
import {
  RESELLER_COMMISSION_ARS,
  type ResellerAttributionLine,
} from "@/types/reseller"

export async function resolveReferralsForCheckout(params: {
  buyerId: string
  validatedProductIds: { productId: string; quantity: number; sellerId: string }[]
  productReferrals?: Record<string, string>
}): Promise<ResellerAttributionLine[]> {
  const { buyerId, validatedProductIds, productReferrals } = params
  if (!productReferrals || Object.keys(productReferrals).length === 0) return []

  const lines: ResellerAttributionLine[] = []

  for (const item of validatedProductIds) {
    const code = productReferrals[item.productId]?.trim()
    if (!code) continue

    const linkSnap = await adminDb.collection("resellerLinks").where("code", "==", code).limit(1).get()
    if (linkSnap.empty) continue

    const link = linkSnap.docs[0].data() as {
      productId?: string
      referrerUserId?: string
      active?: boolean
    }

    if (link.active === false) continue
    if (link.productId !== item.productId) continue
    if (!link.referrerUserId) continue
    if (link.referrerUserId === buyerId) continue
    if (link.referrerUserId === item.sellerId) continue

    const productSnap = await adminDb.collection("products").doc(item.productId).get()
    if (!productSnap.exists) continue
    const product = productSnap.data() as {
      allowResellerShare?: boolean
      isService?: boolean
    }
    if (product.isService) continue
    if (!product.allowResellerShare) continue

    lines.push({
      productId: item.productId,
      quantity: item.quantity,
      referralCode: code,
      referrerUserId: link.referrerUserId,
      sellerId: item.sellerId,
      commissionPerUnit: RESELLER_COMMISSION_ARS,
    })
  }

  return lines
}
