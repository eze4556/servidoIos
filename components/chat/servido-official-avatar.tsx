"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { SERVIDO_OFFICIAL_LOGO_PATH } from "@/lib/servido-official"

type ServidoOfficialAvatarProps = {
  size?: number
  className?: string
}

/** Avatar del canal oficial Servido (logo real, no círculo vacío). */
export function ServidoOfficialAvatar({ size = 56, className }: ServidoOfficialAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-servido-100",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={SERVIDO_OFFICIAL_LOGO_PATH}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain p-0.5"
        unoptimized
      />
    </span>
  )
}
