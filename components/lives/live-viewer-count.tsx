"use client"

import { useEffect, useRef } from "react"
import { useParticipants, useConnectionState } from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import { reportViewerCountApi } from "@/lib/lives"
import { Eye } from "lucide-react"
import { cn } from "@/lib/utils"

function formatViewers(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} mil`
  return `${Math.round(n / 1000)} mil`
}

/**
 * Cuenta participantes que no son el host (identity = sellerId).
 * El host sincroniza el número a Firestore para el rail / lista.
 */
export function LiveViewerCountBadge({
  hostIdentity,
  liveId,
  isHost,
  className,
}: {
  hostIdentity: string
  liveId?: string
  isHost: boolean
  className?: string
}) {
  const participants = useParticipants()
  const connectionState = useConnectionState()
  const lastSent = useRef<number | null>(null)
  const connected = connectionState === ConnectionState.Connected

  const viewerCount = participants.filter((p) => p.identity !== hostIdentity).length

  useEffect(() => {
    if (!isHost || !liveId || !connected) return
    if (lastSent.current === viewerCount) return

    const t = window.setTimeout(() => {
      lastSent.current = viewerCount
      void reportViewerCountApi(liveId, viewerCount).catch((err) =>
        console.warn("[lives] viewerCount sync", err)
      )
    }, 600)

    return () => window.clearTimeout(t)
  }, [isHost, liveId, viewerCount, connected])

  if (!connected) return null

  return (
    <div
      className={cn(
        "pointer-events-none flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md",
        className
      )}
      aria-live="polite"
    >
      <Eye className="h-3.5 w-3.5 opacity-90" />
      <span>
        {formatViewers(viewerCount)} {viewerCount === 1 ? "mirando" : "mirando"}
      </span>
    </div>
  )
}
