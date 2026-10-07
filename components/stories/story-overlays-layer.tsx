"use client"

import type { StoryOverlay } from "@/types/story"
import { cn } from "@/lib/utils"

export function StoryOverlaysLayer({
  overlays,
  interactive = false,
  selectedId,
  onSelect,
  onMove,
  className,
}: {
  overlays: StoryOverlay[]
  interactive?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  onMove?: (id: string, x: number, y: number) => void
  className?: string
}) {
  if (!overlays?.length) return null

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-[5]", className)}>
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className={cn(
            "absolute max-w-[85%] -translate-x-1/2 -translate-y-1/2 select-none whitespace-pre-wrap break-words text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]",
            interactive && "pointer-events-auto cursor-grab active:cursor-grabbing",
            selectedId === overlay.id && interactive && "ring-2 ring-white/80 ring-offset-2 ring-offset-transparent"
          )}
          style={{
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`,
            fontFamily: overlay.fontFamily,
            color: overlay.color || "#ffffff",
            fontSize: overlay.type === "sticker" ? "2.75rem" : "1.35rem",
            fontWeight: overlay.type === "text" ? 700 : 400,
            lineHeight: 1.2,
          }}
          onPointerDown={
            interactive
              ? (e) => {
                  e.stopPropagation()
                  onSelect?.(overlay.id)
                  const parent = (e.currentTarget.parentElement as HTMLElement) || null
                  if (!parent || !onMove) return
                  const rect = parent.getBoundingClientRect()
                  const move = (ev: PointerEvent) => {
                    const x = ((ev.clientX - rect.left) / rect.width) * 100
                    const y = ((ev.clientY - rect.top) / rect.height) * 100
                    onMove(overlay.id, Math.min(95, Math.max(5, x)), Math.min(95, Math.max(5, y)))
                  }
                  const up = () => {
                    window.removeEventListener("pointermove", move)
                    window.removeEventListener("pointerup", up)
                  }
                  window.addEventListener("pointermove", move)
                  window.addEventListener("pointerup", up)
                }
              : undefined
          }
        >
          {overlay.content}
        </div>
      ))}
    </div>
  )
}
