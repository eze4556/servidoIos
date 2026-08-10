import {
  collection,
  doc,
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
  MAX_ACTIVE_VEHICLE_LISTINGS_PER_USER,
  VEHICLE_LISTINGS_COLLECTION,
  type VehicleListing,
  type VehicleListingInput,
  type VehicleListingStatus,
} from "@/types/vehicle-listing"

export function parseVehicleListing(id: string, data: Record<string, unknown>): VehicleListing {
  return {
    id,
    sellerId: String(data.sellerId || ""),
    sellerDisplayName: String(data.sellerDisplayName || ""),
    status: (data.status as VehicleListing["status"]) || "paused",
    vehicleType: (data.vehicleType as VehicleListing["vehicleType"]) || "auto",
    make: String(data.make || ""),
    model: String(data.model || ""),
    trim: data.trim != null ? String(data.trim) : null,
    year: Number(data.year) || 0,
    condition: (data.condition as VehicleListing["condition"]) || "usado",
    mileageKm: data.mileageKm != null ? Number(data.mileageKm) : null,
    fuelType: (data.fuelType as VehicleListing["fuelType"]) ?? null,
    transmission: (data.transmission as VehicleListing["transmission"]) ?? null,
    bodyType: data.bodyType != null ? String(data.bodyType) : null,
    doors: data.doors != null ? Number(data.doors) : null,
    color: data.color != null ? String(data.color) : null,
    engine: data.engine != null ? String(data.engine) : null,
    price: Number(data.price) || 0,
    priceCurrency: (data.priceCurrency as VehicleListing["priceCurrency"]) || "ARS",
    province: String(data.province || ""),
    city: String(data.city || ""),
    locationLabel: String(data.locationLabel || ""),
    latitude: data.latitude != null ? Number(data.latitude) : null,
    longitude: data.longitude != null ? Number(data.longitude) : null,
    title: String(data.title || ""),
    description: String(data.description || ""),
    media: Array.isArray(data.media) ? (data.media as VehicleListing["media"]) : [],
    allowChat: data.allowChat !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function countActiveListingsForSeller(sellerId: string): Promise<number> {
  const q = query(
    collection(db, VEHICLE_LISTINGS_COLLECTION),
    where("sellerId", "==", sellerId),
    where("status", "==", "active")
  )
  const snap = await getCountFromServer(q)
  return snap.data().count
}

export async function createVehicleListingDoc(
  sellerId: string,
  sellerDisplayName: string,
  input: VehicleListingInput
): Promise<string> {
  const activeCount = await countActiveListingsForSeller(sellerId)
  if (activeCount >= MAX_ACTIVE_VEHICLE_LISTINGS_PER_USER) {
    throw new Error("VEHICLE_LISTING_LIMIT")
  }

  const listingRef = doc(collection(db, VEHICLE_LISTINGS_COLLECTION))
  await setDoc(listingRef, {
    ...input,
    sellerId,
    sellerDisplayName,
    status: "active" as VehicleListingStatus,
    allowChat: input.allowChat !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return listingRef.id
}

/** @deprecated use createVehicleListingDoc */
export async function createVehicleListing(
  sellerId: string,
  sellerDisplayName: string,
  input: VehicleListingInput
): Promise<string> {
  return createVehicleListingDoc(sellerId, sellerDisplayName, input)
}

export async function updateVehicleListing(
  listingId: string,
  sellerId: string,
  patch: Partial<VehicleListingInput> & { status?: VehicleListingStatus }
): Promise<void> {
  const snap = await getDoc(doc(db, VEHICLE_LISTINGS_COLLECTION, listingId))
  if (!snap.exists()) throw new Error("NOT_FOUND")
  const data = snap.data()
  if (data.sellerId !== sellerId) throw new Error("FORBIDDEN")

  if (patch.status === "active" && data.status !== "active") {
    const activeCount = await countActiveListingsForSeller(sellerId)
    if (activeCount >= MAX_ACTIVE_VEHICLE_LISTINGS_PER_USER) {
      throw new Error("VEHICLE_LISTING_LIMIT")
    }
  }

  await updateDoc(doc(db, VEHICLE_LISTINGS_COLLECTION, listingId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function fetchVehicleListingById(listingId: string): Promise<VehicleListing | null> {
  const snap = await getDoc(doc(db, VEHICLE_LISTINGS_COLLECTION, listingId))
  if (!snap.exists()) return null
  return parseVehicleListing(snap.id, snap.data() as Record<string, unknown>)
}

export async function fetchSellerVehicleListings(sellerId: string): Promise<VehicleListing[]> {
  const q = query(
    collection(db, VEHICLE_LISTINGS_COLLECTION),
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc"),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => parseVehicleListing(d.id, d.data() as Record<string, unknown>))
}

export async function fetchActiveVehicleListings(options?: {
  priceCurrency?: VehicleListing["priceCurrency"]
  maxDocs?: number
}): Promise<VehicleListing[]> {
  const constraints: QueryConstraint[] = [
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(options?.maxDocs ?? 200),
  ]
  if (options?.priceCurrency) {
    constraints.splice(1, 0, where("priceCurrency", "==", options.priceCurrency))
  }
  try {
    const snap = await getDocs(query(collection(db, VEHICLE_LISTINGS_COLLECTION), ...constraints))
    return snap.docs.map((d) => parseVehicleListing(d.id, d.data() as Record<string, unknown>))
  } catch {
    const snap = await getDocs(
      query(
        collection(db, VEHICLE_LISTINGS_COLLECTION),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(options?.maxDocs ?? 200)
      )
    )
    let list = snap.docs.map((d) => parseVehicleListing(d.id, d.data() as Record<string, unknown>))
    if (options?.priceCurrency) {
      list = list.filter((v) => v.priceCurrency === options.priceCurrency)
    }
    return list
  }
}

export function buildVehicleTitle(make: string, model: string, year: number): string {
  return `${make} ${model} ${year}`.trim()
}
