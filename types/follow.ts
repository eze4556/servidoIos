import type { StoryAuthorType } from "@/types/story"

export type FollowTargetType = StoryAuthorType // "store" | "restaurant"

export interface Follow {
  id: string
  userId: string
  targetUserId: string
  targetType: FollowTargetType
  targetName: string
  targetPhotoURL?: string | null
  /** Doc de restaurants (para deep-link). En stores es null. */
  restaurantId?: string | null
  createdAt?: Date
}

export function followDocId(userId: string, targetUserId: string): string {
  return `${userId}_${targetUserId}`
}

export function profilePathForFollow(follow: Pick<Follow, "targetType" | "targetUserId" | "restaurantId">): string {
  if (follow.targetType === "restaurant") {
    return `/restaurantes/${follow.restaurantId || follow.targetUserId}`
  }
  return `/seller/${follow.targetUserId}`
}
