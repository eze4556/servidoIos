"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import type { StoryAuthorGroup } from "@/types/story"
import { cn } from "@/lib/utils"
import { StoryCreateRing, StoryRing, resolveStoryAvatar } from "@/components/stories/story-ring"

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
  labels,
}: {
  photo: string
  displayName: string
  hasOwnStories: boolean
  onOpenOwn?: () => void
  labels: { yourStory: string; viewYourStory: string; newStory: string }
}) {
  if (hasOwnStories && onOpenOwn) {
    return (
      <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 lg:w-[4.75rem]">
        <div className="relative">
          <button
            type="button"
            onClick={onOpenOwn}
            className="transition-transform hover:scale-105"
            aria-label={labels.viewYourStory}
          >
            <StoryRing photoURL={photo} name={displayName} size="md" className="lg:[&>span]:h-[66px] lg:[&>span]:w-[66px]" />
          </button>
          <Link
            href="/historias/nueva"
            className="absolute -bottom-0.5 -right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-servido-800 text-white ring-2 ring-white"
            aria-label={labels.newStory}
          >
            <Plus className="h-3 w-3" />
          </Link>
        </div>
        <span className="w-full truncate text-center text-[10px] font-semibold text-gray-800">
          {labels.yourStory}
        </span>
      </div>
    )
  }

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 lg:w-[4.75rem]">
      <Link href="/historias/nueva" className="flex w-full flex-col items-center gap-1.5">
        <StoryCreateRing photoURL={photo || null} />
        <span className="w-full truncate text-center text-[10px] font-semibold text-gray-800">
          {labels.yourStory}
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
  const t = useTranslations("storiesRail")
  const { currentUser } = useAuth()
  const railLabels = {
    yourStory: t("yourStory"),
    viewYourStory: t("viewYourStory"),
    newStory: t("newStory"),
  }
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
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5 lg:w-[4.75rem]">
            <div className="h-14 w-14 animate-pulse rounded-full bg-servido-100 lg:h-[66px] lg:w-[66px]" />
            <div className="h-2 w-12 animate-pulse rounded bg-servido-50" />
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
    t("defaultMe")

  return (
    <div
      className={cn(
        "flex max-w-full gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-4",
        className
      )}
    >
      {showCreate && (
        <YourStoryCircle
          photo={photo}
          displayName={displayName}
          hasOwnStories={hasOwnStories}
          onOpenOwn={hasOwnStories ? () => onOpenAuthor(myGroupIndex) : undefined}
          labels={railLabels}
        />
      )}

      {otherGroups.map((group, index) => {
        const isPlatform = group.authorType === "platform"
        const avatar = resolveStoryAvatar(group.authorId, group.authorPhotoURL, group.authorType)
        return (
          <button
            key={group.authorId}
            type="button"
            onClick={() => openOther(index)}
            className="group flex w-16 shrink-0 flex-col items-center gap-1.5 lg:w-[4.75rem]"
          >
            <span className="transition-transform group-hover:scale-105">
              <StoryRing
                photoURL={avatar}
                name={group.authorName}
                size="md"
                isPlatform={isPlatform}
                className="lg:[&>span]:h-[66px] lg:[&>span]:w-[66px]"
              />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-gray-700">
              {isPlatform ? "Servido" : group.authorName}
            </span>
          </button>
        )
      })}
    </div>
  )
}
