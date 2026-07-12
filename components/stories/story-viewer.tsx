"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ExternalLink, Eye, Loader2, Trash2, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { recordStoryView, softDeleteStory } from "@/lib/stories"
import { formatStoryRelativeTime } from "@/lib/story-time"
import { STORY_VIEW_MS, type StoryAuthorGroup } from "@/types/story"

interface StoryViewerProps {
  groups: StoryAuthorGroup[]
  initialAuthorIndex?: number
  open: boolean
  onClose: () => void
  onStoryDeleted?: (storyId: string) => void
}

export function StoryViewer({
  groups,
  initialAuthorIndex = 0,
  open,
  onClose,
  onStoryDeleted,
}: StoryViewerProps) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [authorIndex, setAuthorIndex] = useState(initialAuthorIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const [navigatingOffer, setNavigatingOffer] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [holdHint, setHoldHint] = useState(false)
  const [localViewCount, setLocalViewCount] = useState<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef(0)
  const remainingRef = useRef(STORY_VIEW_MS)
  const holdHintShownRef = useRef(false)
  const touchStartYRef = useRef<number | null>(null)
  const swipingRef = useRef(false)

  const group = groups[authorIndex]
  const story = group?.stories[storyIndex]
  const isAuthor = Boolean(
    currentUser && story && currentUser.firebaseUser.uid === story.authorId
  )

  useEffect(() => {
    if (open) {
      setAuthorIndex(initialAuthorIndex)
      setStoryIndex(0)
      setPaused(false)
      setNavigatingOffer(false)
      setDeleting(false)
      setDeleteOpen(false)
      setDeleteError(null)
      setHoldHint(false)
      setLocalViewCount(null)
      setDragY(0)
      remainingRef.current = STORY_VIEW_MS
      setProgressKey((k) => k + 1)
    }
  }, [open, initialAuthorIndex])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const goNext = useCallback(() => {
    const currentGroup = groups[authorIndex]
    if (!currentGroup) {
      onClose()
      return
    }
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1)
      remainingRef.current = STORY_VIEW_MS
      setLocalViewCount(null)
      setProgressKey((k) => k + 1)
      return
    }
    if (authorIndex < groups.length - 1) {
      setAuthorIndex((i) => i + 1)
      setStoryIndex(0)
      remainingRef.current = STORY_VIEW_MS
      setLocalViewCount(null)
      setProgressKey((k) => k + 1)
      return
    }
    onClose()
  }, [authorIndex, storyIndex, groups, onClose])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
      remainingRef.current = STORY_VIEW_MS
      setLocalViewCount(null)
      setProgressKey((k) => k + 1)
      return
    }
    if (authorIndex > 0) {
      const prevAuthor = authorIndex - 1
      const prevStories = groups[prevAuthor]?.stories || []
      setAuthorIndex(prevAuthor)
      setStoryIndex(Math.max(0, prevStories.length - 1))
      remainingRef.current = STORY_VIEW_MS
      setLocalViewCount(null)
      setProgressKey((k) => k + 1)
    }
  }, [authorIndex, storyIndex, groups])

  useEffect(() => {
    clearTimer()
    if (!open || !story || paused || navigatingOffer || deleting || deleteOpen) return

    startedAtRef.current = Date.now()
    timerRef.current = setTimeout(() => {
      remainingRef.current = STORY_VIEW_MS
      goNext()
    }, remainingRef.current)

    return clearTimer
  }, [
    open,
    story?.id,
    storyIndex,
    authorIndex,
    paused,
    navigatingOffer,
    deleting,
    deleteOpen,
    progressKey,
    goNext,
    clearTimer,
  ])

  // Vistas
  useEffect(() => {
    if (!open || !story || isAuthor) return
    let cancelled = false
    void recordStoryView(story.id).then((count) => {
      if (!cancelled && count != null) setLocalViewCount(count)
    })
    return () => {
      cancelled = true
    }
  }, [open, story?.id, isAuthor])

  // Precargar siguiente
  useEffect(() => {
    if (!open || !group) return
    const nextInGroup = group.stories[storyIndex + 1]
    const nextGroup = groups[authorIndex + 1]?.stories[0]
    const nextUrl = nextInGroup?.imageUrl || nextGroup?.imageUrl
    if (!nextUrl) return
    const img = new window.Image()
    img.src = nextUrl
  }, [open, group, storyIndex, authorIndex, groups])

  const handlePause = () => {
    if (paused || navigatingOffer || deleting || deleteOpen || swipingRef.current) return
    const elapsed = Date.now() - startedAtRef.current
    remainingRef.current = Math.max(50, remainingRef.current - elapsed)
    setPaused(true)
    if (!holdHintShownRef.current) {
      holdHintShownRef.current = true
      setHoldHint(true)
      window.setTimeout(() => setHoldHint(false), 1600)
    }
  }

  const handleResume = () => {
    if (!paused || navigatingOffer || deleting || deleteOpen || swipingRef.current) return
    setPaused(false)
  }

  const openOffer = () => {
    if (!story?.linkUrl || navigatingOffer) return
    setNavigatingOffer(true)
    setPaused(true)
    router.push(story.linkUrl)
  }

  const openDeleteConfirm = () => {
    if (!story || !isAuthor || deleting || navigatingOffer) return
    const elapsed = Date.now() - startedAtRef.current
    remainingRef.current = Math.max(50, remainingRef.current - elapsed)
    setPaused(true)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeleteOpen(false)
    setDeleteError(null)
    setPaused(false)
  }

  const confirmDelete = async () => {
    if (!story || !isAuthor || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const deletedId = story.id
      await softDeleteStory(deletedId)
      setDeleteOpen(false)
      onStoryDeleted?.(deletedId)
    } catch (error) {
      console.error(error)
      setDeleteError("No se pudo borrar. Probá de nuevo.")
      setDeleting(false)
    }
  }

  // Ajustar índices si el padre quitó la historia borrada
  useEffect(() => {
    if (!open || !deleting) return
    if (groups.length === 0) {
      setDeleting(false)
      onClose()
      return
    }
    if (authorIndex >= groups.length) {
      setAuthorIndex(groups.length - 1)
      setStoryIndex(0)
      setDeleting(false)
      setPaused(false)
      remainingRef.current = STORY_VIEW_MS
      setProgressKey((k) => k + 1)
      return
    }
    const g = groups[authorIndex]
    if (!g || g.stories.length === 0) {
      setAuthorIndex(Math.max(0, authorIndex - 1))
      setStoryIndex(0)
      setDeleting(false)
      setPaused(false)
      remainingRef.current = STORY_VIEW_MS
      setProgressKey((k) => k + 1)
      return
    }
    if (storyIndex >= g.stories.length) {
      setStoryIndex(g.stories.length - 1)
    }
    setDeleting(false)
    setPaused(false)
    remainingRef.current = STORY_VIEW_MS
    setProgressKey((k) => k + 1)
  }, [groups, open, deleting, authorIndex, storyIndex, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (navigatingOffer || deleting || deleteOpen) return
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, goNext, goPrev, navigatingOffer, deleting, deleteOpen])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null
    swipingRef.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current == null || navigatingOffer) return
    const y = e.touches[0]?.clientY ?? touchStartYRef.current
    const delta = y - touchStartYRef.current
    if (delta > 12) {
      swipingRef.current = true
      setPaused(true)
      setDragY(Math.min(160, delta))
    }
  }

  const onTouchEnd = () => {
    if (dragY > 90) {
      onClose()
    }
    setDragY(0)
    touchStartYRef.current = null
    if (swipingRef.current) {
      window.setTimeout(() => {
        swipingRef.current = false
        if (!navigatingOffer && !deleting) setPaused(false)
      }, 50)
    }
  }

  if (!open || !group || !story) return null

  const viewCount = localViewCount ?? story.viewCount

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="relative flex h-full w-full max-w-lg flex-col transition-transform duration-150 sm:h-[min(92dvh,820px)] sm:overflow-hidden sm:rounded-3xl"
        style={{ transform: dragY ? `translateY(${dragY}px) scale(${1 - dragY / 800})` : undefined }}
      >
        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1.5 px-3 pt-3">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/35">
              <div
                key={i === storyIndex ? `${s.id}-${progressKey}` : s.id}
                className="h-full origin-left rounded-full bg-white"
                style={
                  i < storyIndex
                    ? { transform: "scaleX(1)" }
                    : i > storyIndex
                      ? { transform: "scaleX(0)" }
                      : {
                          transform: "scaleX(0)",
                          animation: `story-progress-fill ${STORY_VIEW_MS}ms linear forwards`,
                          animationPlayState:
                            paused || navigatingOffer || deleting || deleteOpen ? "paused" : "running",
                        }
                }
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute left-0 right-0 top-4 z-20 flex items-center gap-2.5 px-4 pt-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/25 ring-2 ring-white shadow-md">
            {group.authorPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.authorPhotoURL}
                alt={group.authorName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                {group.authorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white drop-shadow">{group.authorName}</p>
            <p className="text-[10px] text-white/75">
              {formatStoryRelativeTime(story.createdAt)}
              <span className="mx-1 opacity-50">·</span>
              {group.authorType === "restaurant" ? "Restaurante" : "Tienda"}
            </p>
          </div>
          {isAuthor && (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
                <Eye className="h-3.5 w-3.5" />
                {viewCount}
              </span>
              <button
                type="button"
                onClick={openDeleteConfirm}
                disabled={deleting || navigatingOffer || deleteOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-50"
                aria-label="Borrar historia"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={navigatingOffer || deleting || deleteOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <div
          className="relative flex-1"
          onPointerDown={handlePause}
          onPointerUp={handleResume}
          onPointerCancel={handleResume}
          onPointerLeave={handleResume}
        >
          <Image src={story.imageUrl} alt={story.caption || "Historia"} fill className="object-contain" priority />

          <button
            type="button"
            className="absolute inset-y-0 left-0 z-10 w-1/3"
            aria-label="Anterior"
            onClick={goPrev}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 z-10 w-1/3"
            aria-label="Siguiente"
            onClick={goNext}
          />
        </div>

        {(story.caption || story.linkUrl) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-16">
            {story.caption && <p className="text-sm leading-relaxed text-white">{story.caption}</p>}
            {story.linkUrl && (
              <button
                type="button"
                disabled={navigatingOffer}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-servido-900 disabled:opacity-90"
                onClick={openOffer}
              >
                {navigatingOffer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Abriendo oferta…
                  </>
                ) : (
                  <>
                    Ver oferta
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {holdHint && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 z-30 flex justify-center px-6">
            <span className="rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white shadow-lg">
              Mantené para pausar
            </span>
          </div>
        )}

        {deleteOpen && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-[2px] sm:items-center">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-story-title"
              aria-describedby="delete-story-desc"
              className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <h2 id="delete-story-title" className="text-center text-lg font-semibold text-gray-900">
                ¿Borrar esta historia?
              </h2>
              <p id="delete-story-desc" className="mt-2 text-center text-sm text-gray-600">
                Dejará de verse para todos. Esta acción no se puede deshacer.
              </p>
              {deleteError && (
                <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-center text-xs text-red-700">
                  {deleteError}
                </p>
              )}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Borrando…
                    </>
                  ) : (
                    "Sí, borrar"
                  )}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={closeDeleteConfirm}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-70"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {(navigatingOffer || deleting) && !deleteOpen && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-[2px]">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="text-sm font-medium text-white">
              {deleting ? "Borrando…" : "Abriendo oferta…"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
