"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { SERVIDO_OFFICIAL_LOGO_PATH } from "@/lib/servido-official"

type ServidoOfficialAvatarProps = {
  size?: number
  className?: string
}

/** Avatar del canal oficial Servido (ícono app). */
export function ServidoOfficialAvatar({ size = 56, className }: ServidoOfficialAvatarProps) {
  const radius = Math.max(6, Math.round(size * 0.22))
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden shadow-sm", className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Image
        src={SERVIDO_OFFICIAL_LOGO_PATH}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized
      />
    </span>
  )
}
