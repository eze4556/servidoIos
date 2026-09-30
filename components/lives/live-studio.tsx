"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore"
import { Loader2, Radio } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import {
  endLiveApi,
  pinProductApi,
  startLiveApi,
  subscribeLiveSession,
} from "@/lib/lives"
import type { LiveSession } from "@/types/live"
import { LiveRoomShell, LiveHostControlsSlot } from "@/components/lives/live-room-shell"
import { LiveChatPanel } from "@/components/lives/live-chat-panel"
import { LivePinBar } from "@/components/lives/live-pin-bar"
import { LiveStatusScreen } from "@/components/lives/live-status-screen"
import { LiveCameraPreview, type LiveFacingMode } from "@/components/lives/live-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LIVE_TITLE_MAX_LEN } from "@/types/live"
import { getLiveMediaSupport } from "@/lib/live-media"

type ProductOption = {
  id: string
  name: string
  price: number
  imageUrl?: string | null
}

export function LiveStudio() {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState<LiveSession | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [pinning, setPinning] = useState(false)
  const [roomKey, setRoomKey] = useState(0)
  const [showEnded, setShowEnded] = useState(false)
  const [facing, setFacing] = useState<LiveFacingMode>("user")
  const [previewOn, setPreviewOn] = useState(true)

  const uid = currentUser?.firebaseUser.uid
  const canGoLive =
    currentUser?.role === "seller" && currentUser.businessType !== "restaurant"

  useEffect(() => {
    if (authLoading) return
    if (!currentUser) {
      router.replace("/login")
      return
    }
    if (!canGoLive) {
      router.replace("/dashboard/seller")
    }
  }, [authLoading, currentUser, canGoLive, router])

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    async function loadProducts() {
      try {
        const snap = await getDocs(
          query(collection(db, "products"), where("sellerId", "==", uid), limit(40))
        )
        if (cancelled) return
        setProducts(
          snap.docs.map((d) => {
            const data = d.data()
            const media = Array.isArray(data.media) ? data.media : []
            const first = media.find((m: { url?: string }) => m?.url)
            return {
              id: d.id,
              name: String(data.name || "Producto"),
              price: Number(data.price) || 0,
              imageUrl: first?.url || null,
            }
          })
        )
      } catch (err) {
        console.warn("[live-studio] products", err)
      }
    }
    void loadProducts()
    return () => {
      cancelled = true
    }
  }, [uid])

  useEffect(() => {
    if (!live?.id) return
    return subscribeLiveSession(live.id, (next) => {
      if (!next || next.status === "ended") {
        setLive(next)
        setToken(null)
        setShowEnded(true)
        return
      }
      setLive(next)
    })
  }, [live?.id])

  async function handleStart() {
    setStarting(true)
    setError(null)
    setShowEnded(false)
    // Liberar la cámara del preview antes de que LiveKit la tome.
    setPreviewOn(false)
    await new Promise((r) => setTimeout(r, 200))
    try {
      const res = await startLiveApi(title || "En vivo")
      setToken(res.token)
      setServerUrl(res.serverUrl)
      setRoomKey((k) => k + 1)
      setLive({
        id: res.liveId,
        sellerId: uid || "",
        sellerName: currentUser?.name || "Tienda",
        sellerPhotoURL: currentUser?.photoURL || null,
        roomName: res.roomName,
        title: title || "En vivo",
        status: "live",
        viewerCount: 0,
        pinnedProduct: null,
        startedAt: new Date(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar")
      setPreviewOn(true)
    } finally {
      setStarting(false)
    }
  }

  async function handleEnd() {
    if (!live) return
    setEnding(true)
    setError(null)
    try {
      await endLiveApi(live.id)
      setToken(null)
      setServerUrl(null)
      setLive((prev) => (prev ? { ...prev, status: "ended" } : null))
      setShowEnded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo finalizar")
    } finally {
      setEnding(false)
    }
  }

  async function handlePin(productId: string | null) {
    if (!live) return
    setPinning(true)
    setError(null)
    try {
      const pinned = await pinProductApi(live.id, productId)
      setLive((prev) => (prev ? { ...prev, pinnedProduct: pinned } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo fijar")
    } finally {
      setPinning(false)
    }
  }

  if (authLoading || !currentUser || !canGoLive) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  if (showEnded && (!token || live?.status === "ended")) {
    return (
      <LiveStatusScreen
        kind="ended"
        title="Terminaste el vivo"
        body="Cuando quieras, podés volver a transmitir."
        onRetry={() => {
          setShowEnded(false)
          setLive(null)
          setError(null)
          setPreviewOn(true)
        }}
        retryLabel="Transmitir de nuevo"
        secondaryHref="/dashboard/seller"
        secondaryLabel="Volver al panel"
      />
    )
  }

  if (live?.status === "live" && token && serverUrl) {
    return (
      <div className="fixed inset-0 z-[80] bg-black">
        <LiveRoomShell
          token={token}
          serverUrl={serverUrl}
          isHost
          hostIdentity={uid || live.sellerId}
          liveId={live.id}
          roomKey={roomKey}
          initialFacingMode={facing}
          onRetry={() => setRoomKey((k) => k + 1)}
          sideControls={<LiveHostControlsSlot />}
        >
          {/* Header tipo Instagram */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/25 to-transparent px-3 pb-10 pt-[max(0.65rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-black/35 py-1.5 pl-1.5 pr-3 backdrop-blur-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-servido-800 text-sm font-bold text-white">
                  {currentUser.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (currentUser.name || "T").charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{live.sellerName}</p>
                  <p className="truncate text-[11px] text-white/70">{live.title}</p>
                </div>
                <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  En vivo
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25"
                disabled={ending}
                onClick={() => void handleEnd()}
              >
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terminar"}
              </Button>
            </div>
          </div>

          {/* Abajo: producto + chat (deja espacio a la derecha para controles) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-16">
            <div className="pointer-events-auto mr-14 space-y-2.5">
              {live.pinnedProduct ? (
                <LivePinBar
                  product={live.pinnedProduct}
                  canUnpin
                  onUnpin={() => void handlePin(null)}
                />
              ) : null}
              <select
                className="w-full rounded-full border border-white/20 bg-black/45 px-3 py-2 text-sm text-white outline-none backdrop-blur-md"
                disabled={pinning}
                value={live.pinnedProduct?.productId || ""}
                onChange={(e) => void handlePin(e.target.value || null)}
              >
                <option value="">📌 Fijar producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <LiveChatPanel liveId={live.id} compact />
            </div>
          </div>
        </LiveRoomShell>
        {error ? (
          <p className="absolute bottom-2 left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-full bg-red-600/90 px-3 py-1 text-center text-xs text-white">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const mediaSupport = getLiveMediaSupport()

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white">
          <Radio className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-servido-950">Transmitir en vivo</h1>
          <p className="text-sm text-slate-600">
            Mirate en el espejo, elegí cámara y salí al aire cuando estés listo.
          </p>
        </div>
      </div>

      {!mediaSupport.ok ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
          {mediaSupport.reason}
        </div>
      ) : previewOn ? (
        <div className="mb-5">
          <LiveCameraPreview
            facing={facing}
            onFacingChange={setFacing}
            mirrorFront
            className="mx-auto w-full max-w-sm"
          />
          <p className="mt-2 text-center text-xs text-slate-500">
            La frontal se ve en espejo solo para vos; el público la ve normal.
          </p>
        </div>
      ) : (
        <div className="mb-5 flex aspect-[9/16] max-h-[min(40vh,320px)] w-full items-center justify-center rounded-[1.75rem] bg-black text-sm text-white/70">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Liberando cámara…
        </div>
      )}

      <label className="mb-2 block text-sm font-medium text-servido-950">Título del vivo</label>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, LIVE_TITLE_MAX_LEN))}
        placeholder="Ej. Novedades de la semana"
        maxLength={LIVE_TITLE_MAX_LEN}
        className="mb-4"
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <Button
        type="button"
        className="w-full rounded-full bg-red-600 hover:bg-red-700"
        disabled={starting || !mediaSupport.ok}
        onClick={() => void handleStart()}
      >
        {starting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Radio className="mr-2 h-4 w-4" />
        )}
        {starting ? "Conectando…" : "Salir al aire"}
      </Button>

      <p className="mt-4 text-xs text-slate-500">
        Usá https://www.servido.com.ar o la app Android. En HTTP por IP local el celular bloquea la
        cámara.
      </p>
    </div>
  )
}
