import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { getBusinessLocation } from "@/lib/business-location"
import { distanceKm, hasValidCoordinates, STORY_NEARBY_RADIUS_KM } from "@/lib/geo"
import {
  STORY_DAILY_LIMIT,
  STORY_DURATION_MS,
  STORY_VIEW_MS,
  type Story,
  type StoryAuthorGroup,
  type StoryAuthorType,
  type StoryFilterId,
  type StoryMediaType,
  type StoryOverlay,
} from "@/types/story"
import type { BusinessLocation } from "@/lib/geo"
import { sanitizeOverlays } from "@/lib/story-overlays"

export class StoryDailyLimitError extends Error {
  constructor() {
    super(`Llegaste al límite de ${STORY_DAILY_LIMIT} historias por día.`)
    this.name = "StoryDailyLimitError"
  }
}

function toDate(value: unknown): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (value instanceof Timestamp) return value.toDate()
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(value as string | number)
}

function mapStory(id: string, data: Record<string, unknown>): Story {
  const mediaType: StoryMediaType = data.mediaType === "video" ? "video" : "image"
  const trimStartMs = typeof data.trimStartMs === "number" ? data.trimStartMs : 0
  const trimEndMs = typeof data.trimEndMs === "number" ? data.trimEndMs : undefined
  const durationMs =
    typeof data.durationMs === "number" && data.durationMs > 0
      ? data.durationMs
      : mediaType === "video" && trimEndMs != null
        ? Math.max(500, trimEndMs - trimStartMs)
        : STORY_VIEW_MS

  return {
    id,
    authorId: String(data.authorId || ""),
    authorName: String(data.authorName || "Vendedor"),
    authorPhotoURL: (data.authorPhotoURL as string | null | undefined) ?? null,
    authorType: (data.authorType as StoryAuthorType) || "store",
    imageUrl: String(data.imageUrl || ""),
    imagePath: String(data.imagePath || ""),
    mediaType,
    videoUrl: data.videoUrl ? String(data.videoUrl) : null,
    videoPath: data.videoPath ? String(data.videoPath) : null,
    durationMs,
    trimStartMs,
    trimEndMs,
    filterId: (data.filterId as StoryFilterId) || "none",
    overlays: sanitizeOverlays(data.overlays as StoryOverlay[] | undefined),
    productId: data.productId ? String(data.productId) : null,
    caption: data.caption ? String(data.caption) : undefined,
    linkUrl: data.linkUrl ? String(data.linkUrl) : undefined,
    createdAt: toDate(data.createdAt),
    expiresAt: toDate(data.expiresAt),
    isActive: data.isActive !== false,
    viewCount: typeof data.viewCount === "number" ? data.viewCount : 0,
    authorLatitude: typeof data.authorLatitude === "number" ? data.authorLatitude : null,
    authorLongitude: typeof data.authorLongitude === "number" ? data.authorLongitude : null,
    authorCity: data.authorCity ? String(data.authorCity) : null,
    authorLocationLabel: data.authorLocationLabel ? String(data.authorLocationLabel) : null,
  }
}

export function isStoryActive(story: Story, now = new Date()): boolean {
  return story.isActive && story.expiresAt.getTime() > now.getTime()
}

export async function listActiveStories(): Promise<Story[]> {
  const now = new Date()
  let stories: Story[] = []
  try {
    const snap = await getDocs(
      query(
        collection(db, "stories"),
        where("isActive", "==", true),
        where("expiresAt", ">", Timestamp.fromDate(now))
      )
    )
    stories = snap.docs
      .map((d) => mapStory(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (error) {
    console.warn("stories query failed:", error)
    return []
  }

  const withPhotos = await enrichAuthorPhotos(stories)
  return enrichAuthorLocations(withPhotos)
}

/** Completa lat/lng desde el perfil del autor si la historia no los tiene. */
async function enrichAuthorLocations(stories: Story[]): Promise<Story[]> {
  const missingIds = [
    ...new Set(
      stories
        .filter((s) => !hasValidCoordinates(s.authorLatitude, s.authorLongitude))
        .map((s) => s.authorId)
    ),
  ]
  if (missingIds.length === 0) return stories

  const locations = new Map<string, BusinessLocation>()
  await Promise.all(
    missingIds.map(async (authorId) => {
      try {
        const loc = await getBusinessLocation(authorId)
        if (loc) locations.set(authorId, loc)
      } catch (error) {
        console.warn("Could not enrich author location:", authorId, error)
      }
    })
  )

  if (locations.size === 0) return stories

  return stories.map((story) => {
    if (hasValidCoordinates(story.authorLatitude, story.authorLongitude)) return story
    const loc = locations.get(story.authorId)
    if (!loc) return story
    return {
      ...story,
      authorLatitude: loc.latitude,
      authorLongitude: loc.longitude,
      authorCity: loc.city,
      authorLocationLabel: loc.label,
    }
  })
}

/** Filtra historias cercanas al usuario (radio en km). */
export function filterStoriesNearby(
  stories: Story[],
  viewerLat: number,
  viewerLng: number,
  radiusKm = STORY_NEARBY_RADIUS_KM
): Story[] {
  if (!hasValidCoordinates(viewerLat, viewerLng)) return stories

  return stories.filter((story) => {
    // Historias oficiales de Servido siempre visibles
    if (story.authorType === "platform") return true
    if (!hasValidCoordinates(story.authorLatitude, story.authorLongitude)) return false
    return (
      distanceKm(viewerLat, viewerLng, story.authorLatitude!, story.authorLongitude!) <= radiusKm
    )
  })
}

async function enrichAuthorPhotos(stories: Story[]): Promise<Story[]> {
  const missingIds = [...new Set(stories.filter((s) => !s.authorPhotoURL).map((s) => s.authorId))]
  if (missingIds.length === 0) return stories

  const photos = new Map<string, string>()

  await Promise.all(
    missingIds.map(async (authorId) => {
      try {
        const userSnap = await getDoc(doc(db, "users", authorId))
        if (!userSnap.exists()) return
        const data = userSnap.data()
        let photo = typeof data.photoURL === "string" ? data.photoURL : ""

        if (!photo && data.businessType === "restaurant") {
          const restaurantId = (data.restaurantId as string) || authorId
          const restaurantSnap = await getDoc(doc(db, "restaurants", restaurantId))
          const imageUrl = restaurantSnap.data()?.imageUrl
          if (typeof imageUrl === "string" && imageUrl) photo = imageUrl
        }

        if (photo) photos.set(authorId, photo)
      } catch (error) {
        console.warn("Could not enrich author photo:", authorId, error)
      }
    })
  )

  if (photos.size === 0) return stories

  return stories.map((story) => ({
    ...story,
    authorPhotoURL: story.authorPhotoURL || photos.get(story.authorId) || null,
  }))
}

export function groupStoriesByAuthor(stories: Story[]): StoryAuthorGroup[] {
  const map = new Map<string, StoryAuthorGroup>()

  for (const story of stories) {
    const existing = map.get(story.authorId)
    if (existing) {
      existing.stories.push(story)
      if (!existing.authorPhotoURL && story.authorPhotoURL) {
        existing.authorPhotoURL = story.authorPhotoURL
      }
    } else {
      map.set(story.authorId, {
        authorId: story.authorId,
        authorName: story.authorName,
        authorPhotoURL: story.authorPhotoURL,
        authorType: story.authorType,
        stories: [story],
      })
    }
  }

  for (const group of map.values()) {
    group.stories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.authorType === "platform" && b.authorType !== "platform") return -1
    if (b.authorType === "platform" && a.authorType !== "platform") return 1
    const aLatest = a.stories[a.stories.length - 1]?.createdAt.getTime() || 0
    const bLatest = b.stories[b.stories.length - 1]?.createdAt.getTime() || 0
    return bLatest - aLatest
  })
}

export async function resolveAuthorPhotoURL(authorId: string): Promise<string | null> {
  try {
    const userSnap = await getDoc(doc(db, "users", authorId))
    if (!userSnap.exists()) return null
    const data = userSnap.data()
    if (typeof data.photoURL === "string" && data.photoURL) return data.photoURL

    if (data.businessType === "restaurant") {
      const restaurantId = (data.restaurantId as string) || authorId
      const restaurantSnap = await getDoc(doc(db, "restaurants", restaurantId))
      const imageUrl = restaurantSnap.data()?.imageUrl
      if (typeof imageUrl === "string" && imageUrl) return imageUrl
    }
  } catch (error) {
    console.warn("resolveAuthorPhotoURL failed:", error)
  }
  return null
}

export async function countStoriesCreatedToday(authorId: string): Promise<number> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  try {
    const snap = await getDocs(
      query(
        collection(db, "stories"),
        where("authorId", "==", authorId),
        where("createdAt", ">=", Timestamp.fromDate(start))
      )
    )
    return snap.size
  } catch (error) {
    console.warn("countStoriesCreatedToday indexed query failed:", error)
    const snap = await getDocs(query(collection(db, "stories"), where("authorId", "==", authorId)))
    return snap.docs.filter((d) => toDate(d.data().createdAt) >= start).length
  }
}

export interface CreateStoryInput {
  authorId: string
  authorName: string
  authorPhotoURL?: string | null
  authorType: StoryAuthorType
  /** Image file, or video file when mediaType is video */
  file: File
  mediaType?: StoryMediaType
  /** Required for video: poster/thumbnail image */
  thumbnailFile?: File | null
  caption?: string
  linkUrl?: string
  productId?: string | null
  filterId?: StoryFilterId | null
  overlays?: StoryOverlay[] | null
  trimStartMs?: number
  trimEndMs?: number
  durationMs?: number
  businessLocation?: BusinessLocation | null
}

export async function createStory(input: CreateStoryInput): Promise<string> {
  const todayCount = await countStoriesCreatedToday(input.authorId)
  if (todayCount >= STORY_DAILY_LIMIT) {
    throw new StoryDailyLimitError()
  }

  const mediaType: StoryMediaType =
    input.mediaType || (input.file.type.startsWith("video/") ? "video" : "image")

  const storyRef = doc(collection(db, "stories"))
  let imageUrl = ""
  let imagePath = ""
  let videoUrl: string | null = null
  let videoPath: string | null = null

  if (mediaType === "video") {
    const videoExt = input.file.name.split(".").pop() || "mp4"
    videoPath = `stories/${input.authorId}/${storyRef.id}.${videoExt}`
    const videoRef = ref(storage, videoPath)
    await uploadBytes(videoRef, input.file)
    videoUrl = await getDownloadURL(videoRef)

    const thumb = input.thumbnailFile
    if (!thumb) throw new Error("thumbnail_required")
    imagePath = `stories/${input.authorId}/${storyRef.id}-thumb.jpg`
    const thumbRef = ref(storage, imagePath)
    await uploadBytes(thumbRef, thumb)
    imageUrl = await getDownloadURL(thumbRef)
  } else {
    const fileExt = input.file.name.split(".").pop() || "jpg"
    imagePath = `stories/${input.authorId}/${storyRef.id}.${fileExt}`
    const storageRef = ref(storage, imagePath)
    await uploadBytes(storageRef, input.file)
    imageUrl = await getDownloadURL(storageRef)
  }

  const authorPhotoURL =
    input.authorPhotoURL || (await resolveAuthorPhotoURL(input.authorId)) || null

  const location =
    input.businessLocation &&
    hasValidCoordinates(input.businessLocation.latitude, input.businessLocation.longitude)
      ? input.businessLocation
      : await getBusinessLocation(input.authorId)

  const now = Date.now()
  const expiresAt = new Date(now + STORY_DURATION_MS)
  const overlays = sanitizeOverlays(input.overlays)
  const durationMs =
    typeof input.durationMs === "number" && input.durationMs > 0
      ? input.durationMs
      : mediaType === "video"
        ? Math.max(
            500,
            (input.trimEndMs ?? STORY_VIEW_MS) - (input.trimStartMs ?? 0)
          )
        : STORY_VIEW_MS

  await setDoc(storyRef, {
    authorId: input.authorId,
    authorName: input.authorName,
    authorPhotoURL,
    authorType: input.authorType,
    mediaType,
    imageUrl,
    imagePath,
    videoUrl,
    videoPath,
    durationMs,
    trimStartMs: mediaType === "video" ? input.trimStartMs ?? 0 : null,
    trimEndMs: mediaType === "video" ? input.trimEndMs ?? null : null,
    filterId: input.filterId || "none",
    overlays,
    productId: input.productId?.trim() || null,
    caption: input.caption?.trim() || null,
    linkUrl: input.linkUrl?.trim() || null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    isActive: true,
    viewCount: 0,
    authorLatitude: location?.latitude ?? null,
    authorLongitude: location?.longitude ?? null,
    authorCity: location?.city ?? null,
    authorLocationLabel: location?.label ?? null,
  })

  return storyRef.id
}

export async function softDeleteStory(storyId: string): Promise<void> {
  await updateDoc(doc(db, "stories", storyId), {
    isActive: false,
  })
}

/** Registra una vista (una vez por pestaña/sesión). */
export async function recordStoryView(storyId: string): Promise<number | null> {
  if (typeof window !== "undefined") {
    const key = `story-viewed:${storyId}`
    if (sessionStorage.getItem(key)) return null
    sessionStorage.setItem(key, "1")
  }

  try {
    const storyRef = doc(db, "stories", storyId)
    await updateDoc(storyRef, { viewCount: increment(1) })
    const snap = await getDoc(storyRef)
    const count = snap.data()?.viewCount
    return typeof count === "number" ? count : null
  } catch (error) {
    console.warn("recordStoryView failed:", error)
    return null
  }
}
