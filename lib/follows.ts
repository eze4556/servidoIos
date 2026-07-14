import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Follow, FollowTargetType } from "@/types/follow"
import { followDocId } from "@/types/follow"
import type { StoryAuthorGroup } from "@/types/story"

function toDate(value: unknown): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(value as string | number)
}

function mapFollow(id: string, data: Record<string, unknown>): Follow {
  return {
    id,
    userId: String(data.userId || ""),
    targetUserId: String(data.targetUserId || ""),
    targetType: (data.targetType as FollowTargetType) || "store",
    targetName: String(data.targetName || "Comercio"),
    targetPhotoURL: (data.targetPhotoURL as string | null | undefined) ?? null,
    restaurantId: (data.restaurantId as string | null | undefined) ?? null,
    createdAt: toDate(data.createdAt),
  }
}

export async function isFollowing(userId: string, targetUserId: string): Promise<boolean> {
  if (!userId || !targetUserId || userId === targetUserId) return false
  const snap = await getDoc(doc(db, "follows", followDocId(userId, targetUserId)))
  return snap.exists()
}

export async function followBusiness(params: {
  userId: string
  targetUserId: string
  targetType: FollowTargetType
  targetName: string
  targetPhotoURL?: string | null
  restaurantId?: string | null
}): Promise<void> {
  if (!params.userId || !params.targetUserId) throw new Error("Datos incompletos")
  if (params.userId === params.targetUserId) throw new Error("No podés seguirte a vos mismo")

  let restaurantId = params.restaurantId ?? null
  if (params.targetType === "restaurant" && !restaurantId) {
    const userSnap = await getDoc(doc(db, "users", params.targetUserId))
    restaurantId =
      (userSnap.exists() ? (userSnap.data().restaurantId as string | undefined) : undefined) ||
      params.targetUserId
  }

  await setDoc(doc(db, "follows", followDocId(params.userId, params.targetUserId)), {
    userId: params.userId,
    targetUserId: params.targetUserId,
    targetType: params.targetType,
    targetName: params.targetName,
    targetPhotoURL: params.targetPhotoURL || null,
    restaurantId,
    createdAt: serverTimestamp(),
  })
}

export async function unfollowBusiness(userId: string, targetUserId: string): Promise<void> {
  await deleteDoc(doc(db, "follows", followDocId(userId, targetUserId)))
}

export async function listFollowing(userId: string): Promise<Follow[]> {
  const snap = await getDocs(query(collection(db, "follows"), where("userId", "==", userId)))
  return snap.docs
    .map((d) => mapFollow(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
}

export async function listFollowingTargetIds(userId: string): Promise<Set<string>> {
  const list = await listFollowing(userId)
  return new Set(list.map((f) => f.targetUserId))
}

/** Prioriza en el rail a los comercios que el usuario sigue. */
export function sortStoryGroupsByFollowing(
  groups: StoryAuthorGroup[],
  followedIds: Set<string>
): StoryAuthorGroup[] {
  if (followedIds.size === 0) return groups
  return [...groups].sort((a, b) => {
    const aF = followedIds.has(a.authorId) ? 1 : 0
    const bF = followedIds.has(b.authorId) ? 1 : 0
    if (aF !== bF) return bF - aF
    const aLatest = a.stories[a.stories.length - 1]?.createdAt.getTime() || 0
    const bLatest = b.stories[b.stories.length - 1]?.createdAt.getTime() || 0
    return bLatest - aLatest
  })
}

export function subscribeFollowingIds(
  userId: string,
  onChange: (ids: Set<string>) => void
): Unsubscribe {
  const q = query(collection(db, "follows"), where("userId", "==", userId))
  return onSnapshot(
    q,
    (snap) => {
      onChange(new Set(snap.docs.map((d) => String(d.data().targetUserId || ""))))
    },
    () => onChange(new Set())
  )
}
