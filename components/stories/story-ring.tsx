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
  const outer =
    size === "lg"
      ? "h-[66px] w-[66px]"
      : size === "sm"
        ? "h-12 w-12"
        : "h-14 w-14"
  const innerPad = size === "lg" ? "p-[2.5px]" : "p-[2px]"

  return (
    <span
      className={cn(
        "rounded-full p-[2.5px] transition-transform",
        seen ? "bg-gray-300" : isPlatform ? PLATFORM_GRADIENT : RING_GRADIENT,
        className
      )}
    >
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-white",
          innerPad,
          outer
        )}
      >
        <span className="relative h-full w-full overflow-hidden rounded-full bg-servido-100">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt={name} className="h-full w-full object-cover" />
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
        "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-servido-700 to-servido-950 text-white shadow-md ring-2 ring-white lg:h-[66px] lg:w-[66px]",
        className
      )}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoURL} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
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
