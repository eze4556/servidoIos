"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import type { StoryAuthorGroup } from "@/types/story"
import { cn } from "@/lib/utils"

interface StoriesRailProps {
  groups: StoryAuthorGroup[]
  loading?: boolean
  onOpenAuthor: (authorIndex: number) => void
  className?: string
  /** Forzar mostrar “Tu historia” aunque no haya grupos (estilo Instagram) */
  alwaysShowCreate?: boolean
}

function YourStoryCircle({
  photo,
  displayName,
  hasOwnStories,
  onOpenOwn,
}: {
  photo: string
  displayName: string
  hasOwnStories: boolean
  onOpenOwn?: () => void
}) {
  if (hasOwnStories && onOpenOwn) {
    return (
      <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={onOpenOwn}
            className="rounded-full bg-gradient-to-tr from-servido-gold via-orange-400 to-servido-700 p-[2.5px]"
            aria-label="Ver tu historia"
          >
            <span className="relative flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-white p-[2px]">
              <span className="relative h-full w-full overflow-hidden rounded-full bg-purple-100">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-servido-800">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
          </button>
          <Link
            href="/historias/nueva"
            className="absolute -bottom-0.5 -right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-servido-800 text-white ring-2 ring-white"
            aria-label="Nueva historia"
          >
            <Plus className="h-3 w-3" />
          </Link>
        </div>
        <span className="w-full truncate text-center text-[10px] font-semibold text-gray-700">
          Tu historia
        </span>
      </div>
    )
  }

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      <Link href="/historias/nueva" className="flex w-full flex-col items-center gap-1.5">
        <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-servido-700 to-servido-950 text-white shadow-md ring-2 ring-gray-100">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          ) : null}
          <Plus className="relative z-10 h-6 w-6" />
        </span>
        <span className="w-full truncate text-center text-[10px] font-semibold text-gray-700">
          Tu historia
        </span>
      </Link>
    </div>
  )
}

export function StoriesRail({
  groups,
  loading,
  onOpenAuthor,
  className,
  alwaysShowCreate = true,
}: StoriesRailProps) {
  const { currentUser } = useAuth()
  const canPost = currentUser?.role === "seller"
  const myUid = currentUser?.firebaseUser.uid
  const myGroupIndex = myUid ? groups.findIndex((g) => g.authorId === myUid) : -1
  const hasOwnStories = myGroupIndex >= 0
  const otherGroups = myUid ? groups.filter((g) => g.authorId !== myUid) : groups
  const showCreate = Boolean(canPost && alwaysShowCreate)

  const openOther = (filteredIndex: number) => {
    const group = otherGroups[filteredIndex]
    if (!group) return
    const realIndex = groups.findIndex((g) => g.authorId === group.authorId)
    if (realIndex >= 0) onOpenAuthor(realIndex)
  }

  if (loading) {
    return (
      <div className={cn("flex gap-3 overflow-hidden px-1", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <div className="h-14 w-14 animate-pulse rounded-full bg-purple-100" />
            <div className="h-2 w-12 animate-pulse rounded bg-purple-50" />
          </div>
        ))}
      </div>
    )
  }

  if (!showCreate && groups.length === 0) return null

  const photo = currentUser?.photoURL || currentUser?.firebaseUser.photoURL || ""
  const displayName =
    currentUser?.name ||
    currentUser?.firebaseUser.displayName ||
    currentUser?.firebaseUser.email?.split("@")[0] ||
    "Yo"

  return (
    <div
      className={cn(
        "flex max-w-full gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {showCreate && (
        <YourStoryCircle
          photo={photo}
          displayName={displayName}
          hasOwnStories={hasOwnStories}
          onOpenOwn={hasOwnStories ? () => onOpenAuthor(myGroupIndex) : undefined}
        />
      )}

      {otherGroups.map((group, index) => (
        <button
          key={group.authorId}
          type="button"
          onClick={() => openOther(index)}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="rounded-full bg-gradient-to-tr from-servido-gold via-orange-400 to-servido-700 p-[2.5px]">
            <span className="relative flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-white p-[2px]">
              <span className="relative h-full w-full overflow-hidden rounded-full bg-purple-100">
                {group.authorPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={group.authorPhotoURL}
                    alt={group.authorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-servido-800">
                    {group.authorName.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
          </span>
          <span className="w-full truncate text-center text-[10px] font-medium text-gray-700">
            {group.authorName}
          </span>
        </button>
      ))}
    </div>
  )
}
