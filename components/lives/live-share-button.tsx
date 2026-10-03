"use client"

import { useCallback, useState } from "react"
import { Check, Share2 } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { cn } from "@/lib/utils"

const CANONICAL_ORIGIN = "https://www.servido.com.ar"

function absoluteLiveUrl(liveId: string): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "")
  const origin =
    fromEnv ||
    (typeof window !== "undefined" && window.location.hostname.endsWith("servido.com.ar")
      ? window.location.origin
      : CANONICAL_ORIGIN)
  // Link canónico web (path), para que funcione al abrirlo desde WhatsApp / navegador.
  return `${origin.replace(/\/$/, "")}/lives/${encodeURIComponent(liveId)}`
}

function isShareAbort(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const name = "name" in err ? String((err as { name?: string }).name) : ""
  const message = "message" in err ? String((err as { message?: string }).message) : ""
  return (
    name === "AbortError" ||
    /abort|cancel|dismiss|shar(e|ing) canceled/i.test(`${name} ${message}`)
  )
}

async function shareViaSystem(title: string, text: string, url: string): Promise<"ok" | "abort" | "fail"> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import("@capacitor/share")
      // En Android conviene un solo campo de texto con el link adentro.
      await Share.share({
        title,
        text: `${text}\n${url}`,
        dialogTitle: "Compartir vivo",
      })
      return "ok"
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const payload: ShareData = { title, text: `${text}\n${url}` }
      if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
        return "fail"
      }
      await navigator.share(payload)
      return "ok"
    }
  } catch (err) {
    if (isShareAbort(err)) return "abort"
    console.warn("[live-share] system share failed", err)
    return "fail"
  }
  return "fail"
}

function openWhatsApp(text: string, url: string) {
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
  // <a> click conserva el gesto del usuario mejor que window.open tras un await.
  const a = document.createElement("a")
  a.href = wa
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  document.body.appendChild(a)
  a.click()
  a.remove()
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
  const [busy, setBusy] = useState(false)

  const share = useCallback(async () => {
    if (!liveId || busy) return
    setBusy(true)
    try {
      const url = absoluteLiveUrl(liveId)
      const text = `En vivo en Servido: ${sellerName} — ${title}`

      const result = await shareViaSystem("Servido En vivo", text, url)
      if (result === "ok" || result === "abort") return

      openWhatsApp(text, url)

      try {
        await navigator.clipboard?.writeText(`${text}\n${url}`)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false)
    }
  }, [liveId, sellerName, title, busy])

  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={busy || !liveId}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur-md active:scale-95 disabled:opacity-60",
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
