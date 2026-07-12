"use client"

import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"
import { useLocation } from "@/contexts/location-context"
import {
  filterStoriesNearby,
  groupStoriesByAuthor,
  listActiveStories,
} from "@/lib/stories"
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
  const { coordinates, hasValidLocation, loadingLocation, openLocationPicker, shortLocation } =
    useLocation()
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [authorIndex, setAuthorIndex] = useState(0)

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
          // Sin ubicación del usuario no mostramos historias de todo el país
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

  if (!loadingLocation && !hasValidLocation) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={openLocationPicker}
          className="flex w-full items-center gap-3 rounded-2xl bg-purple-50/80 px-3 py-3 text-left ring-1 ring-purple-100"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-servido-800 shadow-sm">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Ver historias cerca tuyo</span>
            <span className="block text-xs text-gray-500">Elegí tu ciudad o barrio (toca acá)</span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <>
      {!loading && groups.length > 0 && shortLocation && (
        <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Cerca · {shortLocation} · {STORY_NEARBY_RADIUS_KM} km
        </p>
      )}
      <StoriesRail
        groups={groups}
        loading={loading || loadingLocation}
        className={className}
        onOpenAuthor={(index) => {
          setAuthorIndex(index)
          setViewerOpen(true)
        }}
      />
      {!loading && !loadingLocation && hasValidLocation && groups.length === 0 && (
        <p className="px-1 text-xs text-gray-500">
          No hay historias cerca por ahora.{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs text-servido-800"
            onClick={openLocationPicker}
          >
            Cambiar zona
          </Button>
        </p>
      )}
      <StoryViewer
        groups={groups}
        initialAuthorIndex={authorIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onStoryDeleted={(storyId) => setGroups((prev) => removeStoryFromGroups(prev, storyId))}
      />
    </>
  )
}
