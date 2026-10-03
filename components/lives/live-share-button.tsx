"use client"

import { useCallback, useState } from "react"
import { Check, Share2 } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { cn } from "@/lib/utils"

function absoluteLiveUrl(liveId: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://www.servido.com.ar")
  )
    .trim()
    .replace(/\/$/, "")
  return `${base}/lives/${encodeURIComponent(liveId)}`
}

async function shareViaNative(title: string, text: string, url: string): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import("@capacitor/share")
      await Share.share({ title, text, url, dialogTitle: "Compartir vivo" })
      return true
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text, url })
      return true
    }
  } catch (err) {
    // Usuario canceló o no soportado → fallback WhatsApp
    if (err instanceof Error && /abort|cancel/i.test(err.message)) return true
  }
  return false
}

export function LiveShareButton({
  liveId,
  sellerName,
  title,
  className,
  compact,
}: {
  liveId: string
  sellerName: string
  title: string
  className?: string
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const share = useCallback(async () => {
    const url = absoluteLiveUrl(liveId)
    const text = `🔴 En vivo en Servido: ${sellerName} — ${title}`

    const usedNative = await shareViaNative("Servido En vivo", text, url)
    if (usedNative) return

    // WhatsApp (web / fallback)
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
    window.open(wa, "_blank", "noopener,noreferrer")

    // Copia al portapapeles por si el popup se bloquea
    try {
      await navigator.clipboard?.writeText(`${text}\n${url}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [liveId, sellerName, title])

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur-md active:scale-95",
        compact ? "h-9 w-9" : "h-9 px-3 text-xs font-semibold",
        className
      )}
      aria-label="Compartir vivo"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
      {!compact ? <span>{copied ? "Link copiado" : "Compartir"}</span> : null}
    </button>
  )
}
