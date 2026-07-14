"use client"

import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLocation } from "@/contexts/location-context"
import {
  filterStoriesNearby,
  groupStoriesByAuthor,
  listActiveStories,
} from "@/lib/stories"
import { sortStoryGroupsByFollowing, subscribeFollowingIds } from "@/lib/follows"
import { STORY_NEARBY_RADIUS_KM } from "@/lib/geo"
import { StoriesRail } from "@/components/stories/stories-rail"
import { StoryViewer } from "@/components/stories/story-viewer"
import { Button } from "@/components/ui/button"
import type { StoryAuthorGroup } from "@/types/story"

interface HomeStoriesSectionProps {
  className?: string
}

function removeStoryFromGroups(groups: StoryAuthorGroup[], storyId: string): StoryAuthorGroup[] {
  return groups
    .map((g) => ({
      ...g,
      stories: g.stories.filter((s) => s.id !== storyId),
    }))
    .filter((g) => g.stories.length > 0)
}

export function HomeStoriesSection({ className }: HomeStoriesSectionProps) {
  const { currentUser } = useAuth()
  const { coordinates, hasValidLocation, loadingLocation, openLocationPicker, shortLocation } =
    useLocation()
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([])
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [authorIndex, setAuthorIndex] = useState(0)
  const canPost = currentUser?.role === "seller"

  const displayGroups = sortStoryGroupsByFollowing(groups, followedIds)

  useEffect(() => {
    const uid = currentUser?.firebaseUser.uid
    if (!uid) {
      setFollowedIds(new Set())
      return
    }
    return subscribeFollowingIds(uid, setFollowedIds)
  }, [currentUser?.firebaseUser.uid])

  useEffect(() => {
    if (loadingLocation) return

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        let stories = await listActiveStories()
        if (hasValidLocation && coordinates) {
          stories = filterStoriesNearby(stories, coordinates.latitude, coordinates.longitude)
        } else {
          stories = []
        }
        if (!cancelled) setGroups(groupStoriesByAuthor(stories))
      } catch (error) {
        console.error("Error loading stories:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [loadingLocation, hasValidLocation, coordinates?.latitude, coordinates?.longitude])

  // Sin zona: igual mostramos “Tu historia” si puede publicar
  if (!loadingLocation && !hasValidLocation) {
    return (
      <div className={className}>
        {canPost && (
          <div className="mb-2">
            <StoriesRail
              groups={[]}
              loading={false}
              alwaysShowCreate
              onOpenAuthor={() => undefined}
            />
          </div>
        )}
        <button
          type="button"
          onClick={openLocationPicker}
          className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-purple-50/80 px-3 py-3 text-left ring-1 ring-purple-100"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-servido-800 shadow-sm">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900">
              Ver historias cerca tuyo
            </span>
            <span className="block truncate text-xs text-gray-500">
              Elegí tu ciudad o barrio (tocá acá)
            </span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className={`min-w-0 max-w-full overflow-x-hidden ${className || ""}`}>
      {!loading && groups.length > 0 && shortLocation && (
        <p className="mb-2 truncate px-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Cerca · {shortLocation} · {STORY_NEARBY_RADIUS_KM} km
        </p>
      )}
      <StoriesRail
        groups={displayGroups}
        loading={loading || loadingLocation}
        alwaysShowCreate
        onOpenAuthor={(index) => {
          setAuthorIndex(index)
          setViewerOpen(true)
        }}
      />
      {!loading && !loadingLocation && hasValidLocation && groups.length === 0 && (
        <p className="mt-1 truncate px-1 text-xs text-gray-500">
          {canPost
            ? "Nadie cerca publicó aún. Subí la tuya con el +."
            : "No hay historias cerca por ahora. "}
          {!canPost && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-servido-800"
              onClick={openLocationPicker}
            >
              Cambiar zona
            </Button>
          )}
        </p>
      )}
      <StoryViewer
        groups={displayGroups}
        initialAuthorIndex={authorIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onStoryDeleted={(storyId) => setGroups((prev) => removeStoryFromGroups(prev, storyId))}
      />
    </div>
  )
}
