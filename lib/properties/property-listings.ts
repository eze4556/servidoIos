import {
  collection,
  doc,
  deleteDoc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  MAX_ACTIVE_PROPERTY_LISTINGS_PER_USER,
  PROPERTY_LISTINGS_COLLECTION,
  type PropertyListing,
  type PropertyListingInput,
  type PropertyListingStatus,
} from "@/types/property-listing"
import { deletePropertyStoragePath } from "@/lib/properties/property-storage"

export function parsePropertyListing(id: string, data: Record<string, unknown>): PropertyListing {
  return {
    id,
    sellerId: String(data.sellerId || ""),
    sellerDisplayName: String(data.sellerDisplayName || ""),
    status: (data.status as PropertyListing["status"]) || "paused",
    propertyType: (data.propertyType as PropertyListing["propertyType"]) || "casa",
    operation: (data.operation as PropertyListing["operation"]) || "venta",
    rooms: data.rooms != null ? Number(data.rooms) : null,
    bathrooms: data.bathrooms != null ? Number(data.bathrooms) : null,
    coveredM2: data.coveredM2 != null ? Number(data.coveredM2) : null,
    totalM2: data.totalM2 != null ? Number(data.totalM2) : null,
    price: Number(data.price) || 0,
    priceCurrency: (data.priceCurrency as PropertyListing["priceCurrency"]) || "ARS",
    expenses: data.expenses != null ? Number(data.expenses) : null,
    province: String(data.province || ""),
    city: String(data.city || ""),
    neighborhood: data.neighborhood != null ? String(data.neighborhood) : null,
    locationLabel: String(data.locationLabel || ""),
    latitude: data.latitude != null ? Number(data.latitude) : null,
    longitude: data.longitude != null ? Number(data.longitude) : null,
    title: String(data.title || ""),
    description: String(data.description || ""),
    media: Array.isArray(data.media) ? (data.media as PropertyListing["media"]) : [],
    allowChat: data.allowChat !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

async function countActiveListingsForSeller(sellerId: string): Promise<number> {
  const q = query(
    collection(db, PROPERTY_LISTINGS_COLLECTION),
    where("sellerId", "==", sellerId),
    where("status", "==", "active")
  )
  const snap = await getCountFromServer(q)
  return snap.data().count
}

export async function createPropertyListingDoc(
  sellerId: string,
  sellerDisplayName: string,
  input: PropertyListingInput
): Promise<string> {
  const activeCount = await countActiveListingsForSeller(sellerId)
  if (activeCount >= MAX_ACTIVE_PROPERTY_LISTINGS_PER_USER) {
    throw new Error("PROPERTY_LISTING_LIMIT")
  }

  const listingRef = doc(collection(db, PROPERTY_LISTINGS_COLLECTION))
  await setDoc(listingRef, {
    ...input,
    sellerId,
    sellerDisplayName,
    status: "active" as PropertyListingStatus,
    allowChat: input.allowChat !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return listingRef.id
}

export async function updatePropertyListing(
  listingId: string,
  sellerId: string,
  patch: Partial<PropertyListingInput> & { status?: PropertyListingStatus }
): Promise<void> {
  const snap = await getDoc(doc(db, PROPERTY_LISTINGS_COLLECTION, listingId))
  if (!snap.exists()) throw new Error("NOT_FOUND")
  const data = snap.data()
  if (data.sellerId !== sellerId) throw new Error("FORBIDDEN")

  if (patch.status === "active" && data.status !== "active") {
    const activeCount = await countActiveListingsForSeller(sellerId)
    if (activeCount >= MAX_ACTIVE_PROPERTY_LISTINGS_PER_USER) {
      throw new Error("PROPERTY_LISTING_LIMIT")
    }
  }

  await updateDoc(doc(db, PROPERTY_LISTINGS_COLLECTION, listingId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function fetchPropertyListingById(listingId: string): Promise<PropertyListing | null> {
  const snap = await getDoc(doc(db, PROPERTY_LISTINGS_COLLECTION, listingId))
  if (!snap.exists()) return null
  return parsePropertyListing(snap.id, snap.data() as Record<string, unknown>)
}

export async function fetchSellerPropertyListings(sellerId: string): Promise<PropertyListing[]> {
  const q = query(
    collection(db, PROPERTY_LISTINGS_COLLECTION),
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc"),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => parsePropertyListing(d.id, d.data() as Record<string, unknown>))
}

export async function fetchActivePropertyListings(options?: {
  priceCurrency?: PropertyListing["priceCurrency"]
  maxDocs?: number
}): Promise<PropertyListing[]> {
  const constraints: QueryConstraint[] = [
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(options?.maxDocs ?? 200),
  ]
  if (options?.priceCurrency) {
    constraints.splice(1, 0, where("priceCurrency", "==", options.priceCurrency))
  }
  try {
    const snap = await getDocs(query(collection(db, PROPERTY_LISTINGS_COLLECTION), ...constraints))
    return snap.docs.map((d) => parsePropertyListing(d.id, d.data() as Record<string, unknown>))
  } catch {
    const snap = await getDocs(
      query(
        collection(db, PROPERTY_LISTINGS_COLLECTION),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(options?.maxDocs ?? 200)
      )
    )
    let list = snap.docs.map((d) => parsePropertyListing(d.id, d.data() as Record<string, unknown>))
    if (options?.priceCurrency) {
      list = list.filter((p) => p.priceCurrency === options.priceCurrency)
    }
    return list
  }
}

export function buildPropertyTitle(
  operation: PropertyListing["operation"],
  propertyType: PropertyListing["propertyType"],
  city: string,
  rooms?: number | null
): string {
  const op =
    operation === "venta" ? "Venta" : operation === "alquiler" ? "Alquiler" : "Temporario"
  const roomsPart = rooms != null && rooms > 0 ? ` · ${rooms} amb` : ""
  return `${op} ${propertyType} ${city}${roomsPart}`.replace(/\s+/g, " ").trim()
}

export async function deletePropertyListing(listingId: string, sellerId: string): Promise<void> {
  const ref = doc(db, PROPERTY_LISTINGS_COLLECTION, listingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("NOT_FOUND")
  const data = snap.data()
  if (data.sellerId !== sellerId) throw new Error("FORBIDDEN")

  const media = Array.isArray(data.media) ? (data.media as { path?: string }[]) : []
  await Promise.all(media.filter((m) => m.path).map((m) => deletePropertyStoragePath(m.path!)))

  await deleteDoc(ref)
}
