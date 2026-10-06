"use client"

import { cn } from "@/lib/utils"

export function ServidoBotAvatar({
  className,
  size = 40,
  pulse = false,
}: {
  className?: string
  size?: number
  pulse?: boolean
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-servido-800 via-servido-950 to-sky-900 shadow-md ring-2 ring-servido-gold/40",
        pulse && "after:absolute after:inset-0 after:animate-pulse after:bg-servido-gold/10",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size * 0.82} height={size * 0.82} fill="none">
        <rect x="14" y="18" width="36" height="30" rx="12" fill="#F8FAFC" />
        <rect x="18" y="24" width="28" height="18" rx="9" fill="#0F172A" />
        <circle cx="26" cy="33" r="3.2" fill="#FFD400" />
        <circle cx="38" cy="33" r="3.2" fill="#FFD400" />
        <path d="M27 40c2.2 2 7.8 2 10 0" stroke="#FFD400" strokeWidth="2" strokeLinecap="round" />
        <rect x="29" y="8" width="6" height="10" rx="3" fill="#A78BFA" />
        <circle cx="32" cy="8" r="3.5" fill="#FFD400" />
        <rect x="8" y="28" width="6" height="12" rx="3" fill="#38BDF8" />
        <rect x="50" y="28" width="6" height="12" rx="3" fill="#38BDF8" />
      </svg>
    </span>
  )
}
