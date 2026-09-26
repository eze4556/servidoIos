"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SERVIDO_OFFICIAL_LOGO_PATH,
  SERVIDO_OFFICIAL_USER_ID,
} from "@/lib/servido-official"

const RING_GRADIENT =
  "bg-gradient-to-tr from-servido-gold via-orange-400 to-servido-800"
const PLATFORM_GRADIENT =
  "bg-gradient-to-tr from-servido-700 via-servido-800 to-servido-950"

const SIZE_CLASS = {
  sm: "h-12 w-12",
  md: "h-14 w-14",
  lg: "h-[66px] w-[66px]",
} as const

export function StoryRing({
  photoURL,
  name,
  size = "md",
  seen = false,
  isPlatform = false,
  className,
}: {
  photoURL?: string | null
  name: string
  size?: "sm" | "md" | "lg"
  seen?: boolean
  isPlatform?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full p-[2.5px]",
        SIZE_CLASS[size],
        seen ? "bg-gray-300" : isPlatform ? PLATFORM_GRADIENT : RING_GRADIENT,
        className
      )}
    >
      <span className="relative h-full w-full overflow-hidden rounded-full bg-white p-[2px]">
        <span
          className={cn(
            "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full",
            isPlatform ? "bg-servido-900" : "bg-servido-100"
          )}
        >
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoURL}
              alt={name}
              className={cn(
                "h-full w-full",
                // Logo app (squircle): contain para que no se deforme ni se salga del círculo
                isPlatform ? "object-contain p-0.5" : "object-cover"
              )}
              draggable={false}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-servido-800">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      </span>
    </span>
  )
}

export function StoryCreateRing({
  photoURL,
  className,
}: {
  photoURL?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-servido-700 to-servido-950 text-white shadow-md ring-2 ring-white lg:h-[66px] lg:w-[66px]",
        className
      )}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoURL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          draggable={false}
        />
      ) : null}
      <Plus className="relative z-10 h-6 w-6" />
    </span>
  )
}

export function resolveStoryAvatar(
  authorId: string,
  authorPhotoURL?: string | null,
  authorType?: string
): string | null | undefined {
  if (authorType === "platform" || authorId === SERVIDO_OFFICIAL_USER_ID) {
    return authorPhotoURL || SERVIDO_OFFICIAL_LOGO_PATH
  }
  return authorPhotoURL
}
