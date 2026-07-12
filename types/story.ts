export type StoryAuthorType = "store" | "restaurant"

export interface Story {
  id: string
  authorId: string
  authorName: string
  authorPhotoURL?: string | null
  authorType: StoryAuthorType
  imageUrl: string
  imagePath: string
  caption?: string
  linkUrl?: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
  viewCount: number
  /** Ubicación del local al publicar */
  authorLatitude?: number | null
  authorLongitude?: number | null
  authorCity?: string | null
  authorLocationLabel?: string | null
}

export interface StoryAuthorGroup {
  authorId: string
  authorName: string
  authorPhotoURL?: string | null
  authorType: StoryAuthorType
  stories: Story[]
}

export const STORY_DURATION_MS = 24 * 60 * 60 * 1000
export const STORY_VIEW_MS = 5000
export const STORY_DAILY_LIMIT = 5
