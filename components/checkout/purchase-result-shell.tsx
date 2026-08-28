import type { ReactNode } from "react"
import Image from "next/image"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type PurchaseResultTone = "success" | "pending" | "failure"

const toneStyles: Record<PurchaseResultTone, { badge: string; glow: string }> = {
  success: {
    badge: "bg-emerald-500 text-white shadow-emerald-500/30",
    glow: "bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(16,185,129,0.18),transparent_55%)]",
  },
  pending: {
    badge: "bg-amber-500 text-white shadow-amber-500/30",
    glow: "bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(245,158,11,0.18),transparent_55%)]",
  },
  failure: {
    badge: "bg-red-500 text-white shadow-red-500/30",
    glow: "bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(239,68,68,0.18),transparent_55%)]",
  },
}

interface PurchaseResultShellProps {
  tone: PurchaseResultTone
  icon: LucideIcon
  pulseIcon?: boolean
  title: string
  subtitle: string
  body: string
  children: ReactNode
  footnote?: string
}

export function PurchaseResultShell({
  tone,
  icon: Icon,
  pulseIcon,
  title,
  subtitle,
  body,
  children,
  footnote,
}: PurchaseResultShellProps) {
  const styles = toneStyles[tone]

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-servido-950 p-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 p-1 ring-1 ring-white/15">
            <Image
              src="/images/logo-128.png"
              alt="Servido"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">Servido</span>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] bg-white px-6 py-9 text-center shadow-[0_32px_70px_-30px_rgba(0,0,0,0.55)] ring-1 ring-white/10 sm:px-8">
          <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-32", styles.glow)} />

          <div className="relative">
            <span
              className={cn(
                "mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-lg",
                styles.badge,
                pulseIcon && "animate-pulse"
              )}
            >
              <Icon className="h-10 w-10" />
            </span>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-servido-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-700">{subtitle}</p>
            <p className="mt-3 leading-relaxed text-slate-500">{body}</p>

            <div className="mt-7 text-left">{children}</div>

            {footnote && <p className="mt-6 text-xs text-slate-400">{footnote}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
