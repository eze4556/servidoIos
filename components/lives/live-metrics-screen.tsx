"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { Clock3, Eye, MessageCircle, Radio, RefreshCw, ShoppingBag, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LiveMetrics } from "@/types/live"
import { cn } from "@/lib/utils"

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m} min ${sec.toString().padStart(2, "0")}s`
  return `${sec}s`
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 text-left ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/55">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}

export function LiveMetricsScreen({
  metrics,
  title,
  onRetry,
  className,
}: {
  metrics: LiveMetrics
  title?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-b from-servido-950 via-black to-black px-5 text-white",
        className
      )}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/90 shadow-lg shadow-red-900/40">
        <Radio className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Vivo terminado</h1>
      <p className="mt-1.5 max-w-sm text-center text-sm text-white/65">
        {title ? `“${title}”` : "Resumen de tu transmisión"}
      </p>

      <div className="mt-7 grid w-full max-w-sm grid-cols-2 gap-2.5">
        <StatCard
          icon={Clock3}
          label="Duración"
          value={formatDuration(metrics.durationSeconds)}
        />
        <StatCard
          icon={Eye}
          label="Pico mirando"
          value={String(metrics.peakViewerCount)}
        />
        <StatCard
          icon={MessageCircle}
          label="Mensajes"
          value={String(metrics.chatMessageCount)}
        />
        <StatCard
          icon={ShoppingBag}
          label="Clics Comprar"
          value={String(metrics.buyClickCount)}
        />
      </div>

      {metrics.followersNotifiedCount > 0 ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-white/55">
          <Users className="h-3.5 w-3.5" />
          Avisamos a {metrics.followersNotifiedCount} seguidor
          {metrics.followersNotifiedCount === 1 ? "" : "es"}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white text-servido-950 hover:bg-white/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Transmitir de nuevo
          </Button>
        ) : null}
        <Button
          asChild
          variant="outline"
          className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/dashboard/seller">Volver al panel</Link>
        </Button>
      </div>
    </div>
  )
}
