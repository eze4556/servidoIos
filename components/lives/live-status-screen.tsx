"use client"

import Link from "next/link"
import { Loader2, Radio, RefreshCw, VideoOff, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type LiveStatusKind =
  | "connecting"
  | "reconnecting"
  | "no-camera"
  | "waiting-host"
  | "ended"
  | "error"
  | "offline"

const COPY: Record<
  LiveStatusKind,
  { title: string; body: string; icon: "loader" | "camera" | "wifi" | "radio" }
> = {
  connecting: {
    title: "Conectando…",
    body: "Estamos entrando a la transmisión.",
    icon: "loader",
  },
  reconnecting: {
    title: "Reconectando…",
    body: "Se cortó un momento la señal. Aguantá un segundo.",
    icon: "loader",
  },
  "no-camera": {
    title: "Sin acceso a la cámara",
    body: "Revisá los permisos o abrí Servido en HTTPS / en la app.",
    icon: "camera",
  },
  "waiting-host": {
    title: "Esperando al vendedor",
    body: "La sala está abierta, pero todavía no hay video.",
    icon: "camera",
  },
  ended: {
    title: "El vivo terminó",
    body: "Esta transmisión ya no está disponible.",
    icon: "radio",
  },
  error: {
    title: "No se pudo conectar",
    body: "Hubo un problema al entrar al vivo.",
    icon: "wifi",
  },
  offline: {
    title: "Sin conexión",
    body: "Revisá tu internet e intentá de nuevo.",
    icon: "wifi",
  },
}

function StatusIcon({ kind }: { kind: LiveStatusKind }) {
  const icon = COPY[kind].icon
  if (icon === "loader") {
    return <Loader2 className="h-10 w-10 animate-spin text-white" />
  }
  if (icon === "camera") {
    return <VideoOff className="h-10 w-10 text-white/80" />
  }
  if (icon === "wifi") {
    return <WifiOff className="h-10 w-10 text-white/80" />
  }
  return <Radio className="h-10 w-10 text-white/80" />
}

export function LiveStatusScreen({
  kind,
  title,
  body,
  detail,
  onRetry,
  retryLabel = "Reintentar",
  secondaryHref = "/lives",
  secondaryLabel = "Ver lives activos",
  className,
  fullscreen = true,
}: {
  kind: LiveStatusKind
  title?: string
  body?: string
  detail?: string | null
  onRetry?: () => void
  retryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  className?: string
  fullscreen?: boolean
}) {
  const copy = COPY[kind]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white",
        fullscreen ? "fixed inset-0 z-[80]" : "absolute inset-0 z-50",
        className
      )}
    >
      <StatusIcon kind={kind} />
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-bold tracking-tight">{title || copy.title}</h1>
        <p className="text-sm leading-relaxed text-white/70">{body || copy.body}</p>
        {detail ? <p className="text-xs leading-relaxed text-amber-200/90">{detail}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {onRetry ? (
          <Button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white text-servido-950 hover:bg-white/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}
        <Button
          asChild
          variant="outline"
          className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
