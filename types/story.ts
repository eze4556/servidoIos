export type StoryAuthorType = "store" | "restaurant" | "reseller" | "platform"

export type StoryMediaType = "image" | "video"

export type StoryFilterId =
  | "none"
  | "warm"
  | "cool"
  | "mono"
  | "vivid"
  | "fade"

export type StoryOverlayType = "text" | "sticker"

export interface StoryOverlay {
  id: string
  type: StoryOverlayType
  content: string
  /** Position as % of frame (0–100), center of overlay */
  x: number
  y: number
  scale: number
  rotation: number
  fontFamily?: string
  color?: string
}

export interface Story {
  id: string
  authorId: string
  authorName: string
  authorPhotoURL?: string | null
  authorType: StoryAuthorType
  /** Poster / cover (always set; for video = thumbnail) */
  imageUrl: string
  imagePath: string
  mediaType: StoryMediaType
  videoUrl?: string | null
  videoPath?: string | null
  /** Playback length in ms (image default 5000; video = trim length) */
  durationMs: number
  trimStartMs?: number
  trimEndMs?: number
  filterId?: StoryFilterId
  overlays?: StoryOverlay[]
  productId?: string | null
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
export const STORY_MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const STORY_MAX_VIDEO_BYTES = 40 * 1024 * 1024
export const STORY_MAX_VIDEO_MS = 15_000

export const STORY_FILTERS: { id: StoryFilterId; css: string }[] = [
  { id: "none", css: "none" },
  { id: "warm", css: "sepia(0.25) saturate(1.25) brightness(1.05)" },
  { id: "cool", css: "saturate(1.1) hue-rotate(15deg) brightness(1.05)" },
  { id: "mono", css: "grayscale(1) contrast(1.05)" },
  { id: "vivid", css: "saturate(1.55) contrast(1.1)" },
  { id: "fade", css: "contrast(0.9) brightness(1.1) saturate(0.85)" },
]

export const STORY_FONTS = [
  { id: "sans", family: "ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", family: "Georgia, 'Times New Roman', serif" },
  { id: "mono", family: "ui-monospace, Consolas, monospace" },
  { id: "display", family: "Impact, Haettenschweiler, 'Arial Black', sans-serif" },
  { id: "rounded", family: "'Trebuchet MS', 'Segoe UI', sans-serif" },
] as const

export const STORY_STICKERS = [
  "🔥",
  "❤️",
  "✨",
  "😍",
  "🎉",
  "💯",
  "🛒",
  "⭐",
  "👏",
  "💎",
  "🚀",
  "😎",
]
