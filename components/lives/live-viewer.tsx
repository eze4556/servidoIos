"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Radio } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getLiveSession, getLiveTokenApi, subscribeLiveSession } from "@/lib/lives"
import type { LiveSession } from "@/types/live"
import { LiveRoomShell } from "@/components/lives/live-room-shell"
import { LiveChatPanel } from "@/components/lives/live-chat-panel"
import { LivePinBar } from "@/components/lives/live-pin-bar"
import { Button } from "@/components/ui/button"
import { sellerHref } from "@/lib/routes"

export function LiveViewer({ liveId: liveIdProp }: { liveId?: string }) {
  const searchParams = useSearchParams()
  const liveId = liveIdProp || searchParams.get("id") || ""
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const [live, setLive] = useState<LiveSession | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!liveId) {
      setLoading(false)
      setError("Falta el id del vivo")
      return
    }

    let cancelled = false
    async function boot() {
      setLoading(true)
      setError(null)
      try {
        const session = await getLiveSession(liveId)
        if (cancelled) return
        if (!session) {
          setError("No encontramos este vivo")
          setLive(null)
          return
        }
        setLive(session)
        if (session.status !== "live") {
          setError("Este vivo ya terminó")
          return
        }
        if (!currentUser) {
          setError("Iniciá sesión para ver el vivo")
          return
        }
        const access = await getLiveTokenApi(liveId)
        if (cancelled) return
        setToken(access.token)
        setServerUrl(access.serverUrl)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo abrir el vivo")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!authLoading) void boot()
    return () => {
      cancelled = true
    }
  }, [liveId, currentUser?.firebaseUser.uid, authLoading])

  useEffect(() => {
    if (!liveId) return
    return subscribeLiveSession(liveId, (next) => {
      setLive(next)
      if (next && next.status === "ended") {
        setToken(null)
        setError("El vendedor finalizó la transmisión")
      }
    })
  }, [liveId])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (!liveId || error || !live || !token || !serverUrl) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <Radio className="h-10 w-10 text-servido-800" />
        <h1 className="text-lg font-bold text-servido-950">En vivo</h1>
        <p className="text-sm text-slate-600">{error || "No hay transmisión disponible"}</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/lives">Ver lives activos</Link>
          </Button>
          {!currentUser ? (
            <Button asChild className="rounded-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <LiveRoomShell token={token} serverUrl={serverUrl} isHost={false}>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/25 to-transparent px-3 pb-10 pt-[max(0.65rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/lives")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Link
              href={sellerHref(live.sellerId)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-black/35 py-1.5 pl-1.5 pr-3 backdrop-blur-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-servido-800 text-sm font-bold text-white">
                {live.sellerPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={live.sellerPhotoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  live.sellerName.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{live.sellerName}</p>
                <p className="truncate text-[11px] text-white/70">{live.title}</p>
              </div>
              <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                En vivo
              </span>
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-16">
          <div className="pointer-events-auto max-w-[88%] space-y-2.5">
            {live.pinnedProduct ? <LivePinBar product={live.pinnedProduct} /> : null}
            <LiveChatPanel liveId={live.id} compact />
          </div>
        </div>
      </LiveRoomShell>
    </div>
  )
}
