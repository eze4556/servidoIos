import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate()
  }
  return null
}

async function getProductName(productId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(productId)) return cache.get(productId)!
  try {
    const snap = await getDoc(doc(db, "products", productId))
    const name = snap.exists() ? String(snap.data()?.name || productId) : productId
    cache.set(productId, name)
    return name
  } catch {
    return productId
  }
}

export type ResellerSaleRow = {
  id: string
  productId: string
  productName: string
  quantity: number
  commissionTotal: number
  createdAt: Date | null
  purchaseId: string
}

export type ResellerLinkRow = {
  id: string
  productId: string
  productName: string
  code: string
  clickCount: number
  active: boolean
}

export type ResellerBatchRow = {
  id: string
  units: number
  amount: number
  status: string
  createdAt: Date | null
  paidAt: string | null
}

export async function loadResellerSales(referrerUserId: string, max = 25): Promise<ResellerSaleRow[]> {
  const productNames = new Map<string, string>()
  let docs: { id: string; data: () => Record<string, unknown> }[] = []

  try {
    const snap = await getDocs(
      query(
        collection(db, "resellerSales"),
        where("referrerUserId", "==", referrerUserId),
        orderBy("createdAt", "desc"),
        limit(max)
      )
    )
    docs = snap.docs
  } catch {
    const snap = await getDocs(
      query(collection(db, "resellerSales"), where("referrerUserId", "==", referrerUserId), limit(50))
    )
    docs = snap.docs.sort((a, b) => {
      const ta = toDate(a.data().createdAt)?.getTime() ?? 0
      const tb = toDate(b.data().createdAt)?.getTime() ?? 0
      return tb - ta
    }).slice(0, max)
  }

  const rows: ResellerSaleRow[] = []
  for (const d of docs) {
    const data = d.data()
    const productId = String(data.productId || "")
    rows.push({
      id: d.id,
      productId,
      productName: await getProductName(productId, productNames),
      quantity: Number(data.quantity || 0),
      commissionTotal: Number(data.commissionTotal || 0),
      createdAt: toDate(data.createdAt),
      purchaseId: String(data.purchaseId || ""),
    })
  }
  return rows
}

export async function loadResellerLinks(referrerUserId: string): Promise<ResellerLinkRow[]> {
  const productNames = new Map<string, string>()
  const snap = await getDocs(
    query(collection(db, "resellerLinks"), where("referrerUserId", "==", referrerUserId), limit(40))
  )

  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data()
      const productId = String(data.productId || "")
      return {
        id: d.id,
        productId,
        productName: await getProductName(productId, productNames),
        code: String(data.code || ""),
        clickCount: Number(data.clickCount || 0),
        active: data.active !== false,
      }
    })
  )

  return rows.sort((a, b) => b.clickCount - a.clickCount)
}

export async function loadResellerPayoutBatches(referrerUserId: string, max = 20): Promise<ResellerBatchRow[]> {
  let docs: { id: string; data: () => Record<string, unknown> }[] = []

  try {
    const snap = await getDocs(
      query(
        collection(db, "resellerPayoutBatches"),
        where("referrerUserId", "==", referrerUserId),
        orderBy("createdAt", "desc"),
        limit(max)
      )
    )
    docs = snap.docs
  } catch {
    const pending = await getDocs(
      query(
        collection(db, "resellerPayoutBatches"),
        where("referrerUserId", "==", referrerUserId),
        where("status", "==", "pending_payout"),
        limit(max)
      )
    )
    const paid = await getDocs(
      query(
        collection(db, "resellerPayoutBatches"),
        where("referrerUserId", "==", referrerUserId),
        where("status", "==", "paid"),
        limit(max)
      )
    )
    const merged = [...pending.docs, ...paid.docs]
    const byId = new Map<string, (typeof merged)[0]>()
    merged.forEach((d) => byId.set(d.id, d))
    docs = [...byId.values()].sort((a, b) => {
      const ta = toDate(a.data().createdAt)?.getTime() ?? 0
      const tb = toDate(b.data().createdAt)?.getTime() ?? 0
      return tb - ta
    }).slice(0, max)
  }

  return docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      units: Number(data.units || 0),
      amount: Number(data.amount || 0),
      status: String(data.status || "pending_payout"),
      createdAt: toDate(data.createdAt),
      paidAt: data.paidAt ? String(data.paidAt) : null,
    }
  })
}
