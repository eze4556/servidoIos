"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, MapPin, MessageSquare, Sparkles, UserPlus } from "lucide-react"
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

export default function HistoriasPage() {
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
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">Historias</h1>
              <p className="truncate text-xs text-gray-500">
                {hasValidLocation
                  ? `Cerca · ${shortLocation || "tu zona"} · ${STORY_NEARBY_RADIUS_KM} km`
                  : "Ofertas y novedades cerca tuyo"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {currentUser && (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs"
                >
                  <Link href="/siguiendo">
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    Siguiendo
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs"
                >
                  <Link href="/mensajes">
                    <MessageSquare className="mr-1 h-3.5 w-3.5" />
                    Mensajes
                  </Link>
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3 text-xs"
              onClick={openLocationPicker}
            >
              <MapPin className="mr-1 h-3.5 w-3.5" />
              Zona
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-4 py-4">
        {/* Siempre el rail estilo IG: “Tu historia” con + aunque no haya otras */}
        {(canPost || loading || loadingLocation || displayGroups.length > 0) && (
          <div className="mb-4">
            <StoriesRail
              groups={displayGroups}
              loading={loading || loadingLocation}
              onOpenAuthor={(index) => {
                setAuthorIndex(index)
                setViewerOpen(true)
              }}
            />
          </div>
        )}

        {loadingLocation || loading ? null : !hasValidLocation ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
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
        ) : displayGroups.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-servido-gold/20 text-servido-900">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">No hay historias cerca</h2>
            <p className="mt-2 text-sm text-gray-600">
              {canPost
                ? "Todavía no hay de otros locales. Subí la tuya con el círculo + de arriba."
                : `Todavía no hay publicaciones a menos de ${STORY_NEARBY_RADIUS_KM} km de tu zona.`}
            </p>
            {!canPost && (
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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
            {displayGroups.map((group, index) => (
              <button
                key={group.authorId}
                type="button"
                onClick={() => {
                  setAuthorIndex(index)
                  setViewerOpen(true)
                }}
                className="group min-w-0 text-left"
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
                  <div className="absolute bottom-2 left-2 right-2 min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{group.authorName}</p>
                    <p className="truncate text-[10px] text-white/80">
                      {group.stories.length} historia{group.stories.length === 1 ? "" : "s"}
                      {followedIds.has(group.authorId) ? " · Siguiendo" : ""}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <StoryViewer
        groups={displayGroups}
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
