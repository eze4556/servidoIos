"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, MapPin, Plus, Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLocation } from "@/contexts/location-context"
import {
  filterStoriesNearby,
  groupStoriesByAuthor,
  listActiveStories,
} from "@/lib/stories"
import { STORY_NEARBY_RADIUS_KM } from "@/lib/geo"
import { StoryViewer } from "@/components/stories/story-viewer"
import { Button } from "@/components/ui/button"
import type { StoryAuthorGroup } from "@/types/story"

export default function HistoriasPage() {
  const { currentUser } = useAuth()
  const { coordinates, hasValidLocation, loadingLocation, openLocationPicker, shortLocation } =
    useLocation()
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [authorIndex, setAuthorIndex] = useState(0)
  const canPost = currentUser?.role === "seller"

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
        console.error(error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [loadingLocation, hasValidLocation, coordinates?.latitude, coordinates?.longitude])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Historias</h1>
              <p className="text-xs text-gray-500">
                {hasValidLocation
                  ? `Cerca tuyo · ${shortLocation || "tu zona"} · ${STORY_NEARBY_RADIUS_KM} km`
                  : "Ofertas y novedades cerca tuyo"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={openLocationPicker}
            >
              <MapPin className="mr-1 h-3.5 w-3.5" />
              Zona
            </Button>
            {canPost && (
              <Button asChild className="rounded-full bg-servido-800 hover:bg-servido-900">
                <Link href="/historias/nueva">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Subir
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loadingLocation || loading ? (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-purple-100/60" />
            ))}
          </div>
        ) : !hasValidLocation ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-gray-100">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-servido-gold/20 text-servido-900">
              <MapPin className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">Elegí tu zona</h2>
            <p className="mt-2 text-sm text-gray-600">
              Así te mostramos solo historias de locales cerca (no de otras ciudades).
            </p>
            <Button
              type="button"
              className="mt-6 rounded-full bg-servido-800"
              onClick={openLocationPicker}
            >
              Elegir ciudad o barrio
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-gray-100">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-servido-gold/20 text-servido-900">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">No hay historias cerca</h2>
            <p className="mt-2 text-sm text-gray-600">
              Todavía no hay publicaciones a menos de {STORY_NEARBY_RADIUS_KM} km de tu zona.
            </p>
            {canPost ? (
              <Button asChild className="mt-6 rounded-full bg-servido-800">
                <Link href="/historias/nueva">Publicar la primera</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="mt-6 rounded-full"
                onClick={openLocationPicker}
              >
                Cambiar zona
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {groups.map((group, index) => (
              <button
                key={group.authorId}
                type="button"
                onClick={() => {
                  setAuthorIndex(index)
                  setViewerOpen(true)
                }}
                className="group text-left"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 ring-2 ring-servido-gold/50 transition group-hover:ring-servido-700">
                  {group.stories[0]?.imageUrl ? (
                    <Image
                      src={group.stories[0].imageUrl}
                      alt={group.authorName}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="truncate text-xs font-semibold text-white">{group.authorName}</p>
                    <p className="text-[10px] text-white/80">
                      {group.stories.length} historia{group.stories.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <StoryViewer
        groups={groups}
        initialAuthorIndex={authorIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onStoryDeleted={(storyId) =>
          setGroups((prev) =>
            prev
              .map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== storyId) }))
              .filter((g) => g.stories.length > 0)
          )
        }
      />
    </div>
  )
}
