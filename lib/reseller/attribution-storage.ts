const STORAGE_KEY = "servido-reseller-attribution"

export type StoredResellerAttribution = {
  productId: string
  code: string
  savedAt: number
}

export function saveResellerAttribution(productId: string, code: string) {
  if (typeof window === "undefined") return
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const map: Record<string, StoredResellerAttribution> = raw ? JSON.parse(raw) : {}
    map[productId] = { productId, code, savedAt: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getResellerAttributionForProduct(productId: string): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, StoredResellerAttribution>
    return map[productId]?.code || null
  } catch {
    return null
  }
}

export function buildReferralPayloadForProducts(
  productIds: string[]
): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const id of productIds) {
    const code = getResellerAttributionForProduct(id)
    if (code) out[id] = code
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function productUrlWithRef(origin: string, productId: string, code: string): string {
  const url = new URL(`${origin.replace(/\/$/, "")}/product/${productId}`)
  url.searchParams.set("ref", code)
  return url.toString()
}
