import {
  STORY_FILTERS,
  STORY_MAX_VIDEO_MS,
  type StoryFilterId,
} from "@/types/story"

export { newOverlayId, sanitizeOverlays } from "@/lib/story-overlays"

export function storyFilterCss(filterId?: StoryFilterId | null): string {
  const found = STORY_FILTERS.find((f) => f.id === (filterId || "none"))
  return found?.css || "none"
}

/** Export image as 9:16 JPEG (cover crop, centered). */
export async function exportImageCover9x16(file: File, maxWidth = 1080): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const targetRatio = 9 / 16
  const srcRatio = bitmap.width / bitmap.height

  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height

  if (srcRatio > targetRatio) {
    sw = Math.round(bitmap.height * targetRatio)
    sx = Math.round((bitmap.width - sw) / 2)
  } else {
    sh = Math.round(bitmap.width / targetRatio)
    sy = Math.round((bitmap.height - sh) / 2)
  }

  const outW = Math.min(maxWidth, sw)
  const outH = Math.round(outW / targetRatio)

  const canvas = document.createElement("canvas")
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas_unavailable")
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("export_failed"))),
      "image/jpeg",
      0.9
    )
  })

  return new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" })
}

/** Capture a frame from a video file as JPEG thumbnail. */
export async function captureVideoThumbnail(
  file: File,
  atSeconds = 0.1
): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    video.src = url

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error("video_load_failed"))
    })

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const seekTo = Math.min(Math.max(atSeconds, 0), Math.max(duration - 0.05, 0))
    if (seekTo > 0) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve()
        video.currentTime = seekTo
      })
    }

    const targetRatio = 9 / 16
    const vw = video.videoWidth || 720
    const vh = video.videoHeight || 1280
    const srcRatio = vw / vh
    let sx = 0
    let sy = 0
    let sw = vw
    let sh = vh
    if (srcRatio > targetRatio) {
      sw = Math.round(vh * targetRatio)
      sx = Math.round((vw - sw) / 2)
    } else {
      sh = Math.round(vw / targetRatio)
      sy = Math.round((vh - sh) / 2)
    }

    const outW = 720
    const outH = Math.round(outW / targetRatio)
    const canvas = document.createElement("canvas")
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas_unavailable")
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("thumb_failed"))),
        "image/jpeg",
        0.85
      )
    })
    return new File([blob], `story-thumb-${Date.now()}.jpg`, { type: "image/jpeg" })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function getVideoDurationMs(file: File): Promise<number> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error("video_meta_failed"))
    })
    const ms = Math.round((video.duration || 0) * 1000)
    return Number.isFinite(ms) ? ms : 0
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function clampVideoTrim(
  durationMs: number,
  trimStartMs: number,
  trimEndMs: number
): { trimStartMs: number; trimEndMs: number; durationMs: number } {
  const maxEnd = Math.min(durationMs, STORY_MAX_VIDEO_MS)
  let start = Math.max(0, Math.min(trimStartMs, Math.max(0, maxEnd - 500)))
  let end = Math.max(start + 500, Math.min(trimEndMs, durationMs, start + STORY_MAX_VIDEO_MS))
  if (end - start > STORY_MAX_VIDEO_MS) {
    end = start + STORY_MAX_VIDEO_MS
  }
  return { trimStartMs: start, trimEndMs: end, durationMs: end - start }
}
