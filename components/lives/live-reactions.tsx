"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useDataChannel, useConnectionState } from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import { cn } from "@/lib/utils"

export type LiveReactionEmoji = "❤️" | "🔥" | "👏" | "😍"

type FloatingReaction = {
  id: string
  emoji: LiveReactionEmoji
  left: number
}

const REACTION_TOPIC = "servido-live-reaction"
const REACTION_OPTIONS: LiveReactionEmoji[] = ["❤️", "🔥", "👏", "😍"]
const MAX_FLOATING = 24
const SEND_COOLDOWN_MS = 350

type Payload = { t: "reaction"; e: LiveReactionEmoji }

function parsePayload(data: Uint8Array): LiveReactionEmoji | null {
  try {
    const text = new TextDecoder().decode(data)
    const json = JSON.parse(text) as Payload
    if (json?.t !== "reaction") return null
    if (!REACTION_OPTIONS.includes(json.e)) return null
    return json.e
  } catch {
    return null
  }
}

function FloatingLayer({ items }: { items: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="absolute bottom-[28%] text-3xl drop-shadow-lg"
          style={{
            left: `${item.left}%`,
            animation: "servidoLiveReaction 2.4s ease-out forwards",
          }}
          aria-hidden
        >
          {item.emoji}
        </span>
      ))}
    </div>
  )
}

/**
 * Reacciones en tiempo real vía LiveKit data channel (sin chat).
 * Botones a la derecha + emojis flotando.
 */
export function LiveReactions({ className }: { className?: string }) {
  const connectionState = useConnectionState()
  const connected = connectionState === ConnectionState.Connected
  const [floating, setFloating] = useState<FloatingReaction[]>([])
  const lastSent = useRef(0)
  const idRef = useRef(0)

  const spawn = useCallback((emoji: LiveReactionEmoji) => {
    idRef.current += 1
    const id = `r-${idRef.current}-${Date.now()}`
    const left = 58 + Math.random() * 28
    setFloating((prev) => [...prev.slice(-(MAX_FLOATING - 1)), { id, emoji, left }])
    window.setTimeout(() => {
      setFloating((prev) => prev.filter((x) => x.id !== id))
    }, 2500)
  }, [])

  const { send } = useDataChannel(REACTION_TOPIC, (msg) => {
    const emoji = parsePayload(msg.payload)
    if (emoji) spawn(emoji)
  })

  const react = useCallback(
    async (emoji: LiveReactionEmoji) => {
      if (!connected) return
      const now = Date.now()
      if (now - lastSent.current < SEND_COOLDOWN_MS) return
      lastSent.current = now
      spawn(emoji)
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ t: "reaction", e: emoji } satisfies Payload)
        )
        await send(payload, { reliable: false })
      } catch (err) {
        console.warn("[live-reactions] send failed", err)
      }
    },
    [connected, send, spawn]
  )

  useEffect(() => {
    if (!connected) setFloating([])
  }, [connected])

  if (!connected) return null

  return (
    <>
      <FloatingLayer items={floating} />
      <div
        className={cn(
          "pointer-events-auto flex flex-col items-center gap-2",
          className
        )}
      >
        {REACTION_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void react(emoji)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xl shadow-lg ring-1 ring-white/20 backdrop-blur-md active:scale-90"
            aria-label={`Reaccionar ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  )
}
