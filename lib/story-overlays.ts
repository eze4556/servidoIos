import type { StoryOverlay } from "@/types/story"

export function newOverlayId(): string {
  return `ov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function sanitizeOverlays(overlays?: StoryOverlay[] | null): StoryOverlay[] {
  if (!Array.isArray(overlays)) return []
  return overlays
    .filter((o) => o && (o.type === "text" || o.type === "sticker") && String(o.content || "").trim())
    .slice(0, 20)
    .map((o) => ({
      id: String(o.id || newOverlayId()),
      type: o.type,
      content: String(o.content).slice(0, o.type === "sticker" ? 8 : 80),
      x: Math.min(100, Math.max(0, Number(o.x) || 50)),
      y: Math.min(100, Math.max(0, Number(o.y) || 40)),
      scale: Math.min(3, Math.max(0.5, Number(o.scale) || 1)),
      rotation: Number(o.rotation) || 0,
      fontFamily: o.fontFamily ? String(o.fontFamily).slice(0, 120) : undefined,
      color: o.color ? String(o.color).slice(0, 30) : undefined,
    }))
}
