"use client"

import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { sendLiveChatApi, subscribeLiveChat } from "@/lib/lives"
import type { LiveChatMessage } from "@/types/live"
import { LIVE_CHAT_MAX_LEN } from "@/types/live"
import { cn } from "@/lib/utils"

/** Chat tipo Instagram/TikTok: burbujas sobre el video + input abajo. */
export function LiveChatPanel({
  liveId,
  className,
  compact,
}: {
  liveId: string
  className?: string
  compact?: boolean
}) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeLiveChat(liveId, setMessages, (err) =>
      console.error("[live-chat]", err)
    )
  }, [liveId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setError(null)
    try {
      await sendLiveChatApi(liveId, value)
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn(
          "flex flex-col justify-end gap-1.5 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_18%)]",
          compact ? "max-h-[28vh]" : "max-h-[34vh]"
        )}
      >
        {messages.length === 0 ? (
          <p className="px-1 text-xs text-white/55">Decí hola 👋</p>
        ) : (
          messages.slice(-40).map((m) => (
            <div
              key={m.id}
              className="max-w-[85%] rounded-2xl bg-black/40 px-2.5 py-1.5 text-white shadow-sm backdrop-blur-md"
            >
              <span className="text-[11px] font-bold text-amber-300">{m.userName}</span>
              <p className="text-[13px] leading-snug">{m.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, LIVE_CHAT_MAX_LEN))}
          placeholder="Comentario…"
          maxLength={LIVE_CHAT_MAX_LEN}
          className="min-w-0 flex-1 rounded-full border border-white/25 bg-black/45 px-4 py-2.5 text-sm text-white placeholder:text-white/45 outline-none backdrop-blur-md focus:border-white/50"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-servido-950 disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
