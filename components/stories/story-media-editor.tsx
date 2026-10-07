"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Type, Sticker, Sparkles, Scissors, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { StoryOverlaysLayer } from "@/components/stories/story-overlays-layer"
import { newOverlayId, storyFilterCss } from "@/lib/story-editor"
import {
  STORY_FILTERS,
  STORY_FONTS,
  STORY_MAX_VIDEO_MS,
  STORY_STICKERS,
  type StoryFilterId,
  type StoryOverlay,
} from "@/types/story"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EditorTool = "filter" | "text" | "sticker" | "trim" | null

export function StoryMediaEditor({
  mediaType,
  previewUrl,
  filterId,
  overlays,
  trimStartMs,
  trimEndMs,
  videoDurationMs,
  onFilterChange,
  onOverlaysChange,
  onTrimChange,
}: {
  mediaType: "image" | "video"
  previewUrl: string
  filterId: StoryFilterId
  overlays: StoryOverlay[]
  trimStartMs: number
  trimEndMs: number
  videoDurationMs: number
  onFilterChange: (id: StoryFilterId) => void
  onOverlaysChange: (next: StoryOverlay[]) => void
  onTrimChange: (start: number, end: number) => void
}) {
  const t = useTranslations("storyComposer.editor")
  const [tool, setTool] = useState<EditorTool>("filter")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState("")
  const [fontId, setFontId] = useState<(typeof STORY_FONTS)[number]["id"]>("sans")
  const [textColor, setTextColor] = useState("#ffffff")
  const videoRef = useRef<HTMLVideoElement>(null)

  const selected = useMemo(
    () => overlays.find((o) => o.id === selectedId) || null,
    [overlays, selectedId]
  )

  const maxTrimEnd = Math.min(videoDurationMs || STORY_MAX_VIDEO_MS, STORY_MAX_VIDEO_MS)

  useEffect(() => {
    const video = videoRef.current
    if (!video || mediaType !== "video") return
    const start = trimStartMs / 1000
    try {
      video.currentTime = start
    } catch {
      /* ignore */
    }
  }, [trimStartMs, mediaType, previewUrl])

  const addText = () => {
    const content = textDraft.trim()
    if (!content) return
    const font = STORY_FONTS.find((f) => f.id === fontId) || STORY_FONTS[0]
    const overlay: StoryOverlay = {
      id: newOverlayId(),
      type: "text",
      content: content.slice(0, 80),
      x: 50,
      y: 40,
      scale: 1,
      rotation: 0,
      fontFamily: font.family,
      color: textColor,
    }
    onOverlaysChange([...overlays, overlay])
    setSelectedId(overlay.id)
    setTextDraft("")
  }

  const addSticker = (emoji: string) => {
    const overlay: StoryOverlay = {
      id: newOverlayId(),
      type: "sticker",
      content: emoji,
      x: 50,
      y: 55,
      scale: 1,
      rotation: 0,
    }
    onOverlaysChange([...overlays, overlay])
    setSelectedId(overlay.id)
  }

  const removeSelected = () => {
    if (!selectedId) return
    onOverlaysChange(overlays.filter((o) => o.id !== selectedId))
    setSelectedId(null)
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-3xl bg-black shadow-lg ring-1 ring-black/10">
        <div className="absolute inset-0" style={{ filter: storyFilterCss(filterId) }}>
          {mediaType === "video" ? (
            <video
              ref={videoRef}
              src={previewUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              loop
              autoPlay
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <StoryOverlaysLayer
          overlays={overlays}
          interactive
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={(id, x, y) =>
            onOverlaysChange(overlays.map((o) => (o.id === id ? { ...o, x, y } : o)))
          }
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            ["filter", Sparkles, t("filters")],
            ["text", Type, t("text")],
            ["sticker", Sticker, t("stickers")],
            ...(mediaType === "video" ? [["trim", Scissors, t("trim")] as const] : []),
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id as EditorTool)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
              tool === id
                ? "bg-servido-950 text-white ring-servido-950"
                : "bg-white text-slate-700 ring-slate-200"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        {selected && (
          <button
            type="button"
            onClick={removeSelected}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("remove")}
          </button>
        )}
      </div>

      {tool === "filter" && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STORY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold ring-1",
                filterId === f.id
                  ? "bg-servido-950 text-white ring-servido-950"
                  : "bg-white text-slate-700 ring-slate-200"
              )}
            >
              {t(`filterNames.${f.id}`)}
            </button>
          ))}
        </div>
      )}

      {tool === "text" && (
        <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
          <input
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder={t("textPlaceholder")}
            maxLength={80}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-servido-400"
          />
          <div className="flex flex-wrap gap-1.5">
            {STORY_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontId(f.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                  fontId === f.id
                    ? "bg-servido-950 text-white ring-servido-950"
                    : "bg-slate-50 text-slate-700 ring-slate-200"
                )}
                style={{ fontFamily: f.family }}
              >
                {t(`fonts.${f.id}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {["#ffffff", "#fbbf24", "#f472b6", "#38bdf8", "#4ade80"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTextColor(c)}
                className={cn(
                  "h-7 w-7 rounded-full ring-2",
                  textColor === c ? "ring-servido-900" : "ring-transparent"
                )}
                style={{ backgroundColor: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)" }}
                aria-label={c}
              />
            ))}
            <Button type="button" size="sm" className="ml-auto" onClick={addText}>
              {t("addText")}
            </Button>
          </div>
        </div>
      )}

      {tool === "sticker" && (
        <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
          {STORY_STICKERS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addSticker(emoji)}
              className="rounded-xl bg-slate-50 py-2 text-2xl hover:bg-slate-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {tool === "trim" && mediaType === "video" && (
        <div className="space-y-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-500">
            {t("trimHint", {
              max: Math.round(STORY_MAX_VIDEO_MS / 1000),
              length: Math.round((trimEndMs - trimStartMs) / 1000),
            })}
          </p>
          <label className="block text-xs font-medium text-slate-600">
            {t("trimStart")}
            <input
              type="range"
              min={0}
              max={Math.max(0, maxTrimEnd - 500)}
              step={100}
              value={trimStartMs}
              onChange={(e) => {
                const start = Number(e.target.value)
                const end = Math.min(
                  Math.max(start + 500, trimEndMs),
                  start + STORY_MAX_VIDEO_MS,
                  videoDurationMs
                )
                onTrimChange(start, end)
              }}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t("trimEnd")}
            <input
              type="range"
              min={Math.min(trimStartMs + 500, maxTrimEnd)}
              max={Math.min(videoDurationMs, trimStartMs + STORY_MAX_VIDEO_MS)}
              step={100}
              value={trimEndMs}
              onChange={(e) => onTrimChange(trimStartMs, Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>
      )}
    </div>
  )
}
