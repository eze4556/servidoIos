"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/components-react"
import { ConnectionState, Track, facingModeFromLocalTrack, type LocalVideoTrack } from "livekit-client"
import "@livekit/components-styles"
import { Mic, MicOff, SwitchCamera, Volume2, VolumeX, Video, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLiveMediaSupport } from "@/lib/live-media"
import { LiveStatusScreen } from "@/components/lives/live-status-screen"
import { LiveViewerCountBadge } from "@/components/lives/live-viewer-count"
import { LiveReactions } from "@/components/lives/live-reactions"

function LiveConnectionOverlay({
  isHost,
  onRetry,
}: {
  isHost: boolean
  onRetry?: () => void
}) {
  const connectionState = useConnectionState()

  if (
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.SignalReconnecting ||
    connectionState === ConnectionState.Reconnecting
  ) {
    const kind =
      connectionState === ConnectionState.Connecting ? "connecting" : "reconnecting"
    return (
      <LiveStatusScreen
        kind={kind}
        fullscreen={false}
        onRetry={undefined}
        secondaryHref={isHost ? "/dashboard/seller" : "/lives"}
        secondaryLabel={isHost ? "Volver al panel" : "Salir"}
      />
    )
  }

  if (connectionState === ConnectionState.Disconnected) {
    return (
      <LiveStatusScreen
        kind="error"
        title="Se cortó la conexión"
        body={
          isHost
            ? "Perdiste la señal. Podés reintentar o terminar el vivo desde el panel."
            : "Se cortó la transmisión. Tocá reintentar o volvé a la lista."
        }
        fullscreen={false}
        onRetry={onRetry}
        secondaryHref={isHost ? "/dashboard/seller" : "/lives"}
        secondaryLabel={isHost ? "Ir al panel" : "Ver lives"}
      />
    )
  }

  return null
}

function LiveStage({
  isHost,
  mediaOk,
  mediaReason,
}: {
  isHost: boolean
  mediaOk: boolean
  mediaReason?: string
}) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  )
  const connectionState = useConnectionState()
  const connected = connectionState === ConnectionState.Connected

  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera && t.publication?.track
  )

  const hostTrack =
    cameraTracks.find((t) => t.participant.isLocal && isHost) ||
    cameraTracks.find((t) => !t.participant.isLocal) ||
    cameraTracks[0]

  const hasVideo = Boolean(hostTrack?.publication?.track)

  // Espejo solo para el host viendo su propia frontal (el stream enviado no se espeja).
  let mirrorLocal = false
  if (isHost && hostTrack?.participant.isLocal && hostTrack.publication?.track) {
    try {
      const mode = facingModeFromLocalTrack(hostTrack.publication.track as LocalVideoTrack)
      mirrorLocal = mode.facingMode === "user"
    } catch {
      mirrorLocal = true
    }
  }

  return (
    <div className="relative h-full w-full bg-black">
      {hasVideo ? (
        <VideoTrack
          trackRef={hostTrack!}
          className={cn("h-full w-full object-cover", mirrorLocal && "scale-x-[-1]")}
        />
      ) : connected ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <VideoOff className="h-12 w-12 opacity-70" />
          <p className="text-base font-medium">
            {isHost
              ? mediaOk
                ? "Encendé la cámara para transmitir"
                : "Sin acceso a la cámara"
              : "Esperando que el vendedor encienda la cámara…"}
          </p>
          {isHost && !mediaOk && mediaReason ? (
            <p className="max-w-sm text-sm leading-relaxed text-amber-200/95">{mediaReason}</p>
          ) : null}
          {!isHost ? (
            <p className="text-xs text-white/50">Si tarda mucho, pedile que revise la cámara.</p>
          ) : null}
        </div>
      ) : (
        <div className="h-full w-full bg-black" />
      )}
    </div>
  )
}

export function HostSideControls({ className }: { className?: string }) {
  const { localParticipant } = useLocalParticipant()
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [facing, setFacing] = useState<"user" | "environment">("user")
  const [flipping, setFlipping] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setMicOn(localParticipant.isMicrophoneEnabled)
    setCamOn(localParticipant.isCameraEnabled)
    const pub = localParticipant.getTrackPublication(Track.Source.Camera)
    const track = pub?.track as LocalVideoTrack | undefined
    if (track) {
      const detected = facingModeFromLocalTrack(track)
      if (detected.facingMode === "user" || detected.facingMode === "environment") {
        setFacing(detected.facingMode)
      }
    }
  }, [
    localParticipant,
    localParticipant.isMicrophoneEnabled,
    localParticipant.isCameraEnabled,
  ])

  const toggleMic = useCallback(async () => {
    setErr(null)
    const support = getLiveMediaSupport()
    if (!support.ok) {
      setErr(support.reason || "Sin micrófono")
      return
    }
    try {
      const next = !localParticipant.isMicrophoneEnabled
      await localParticipant.setMicrophoneEnabled(next)
      setMicOn(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo usar el micrófono")
    }
  }, [localParticipant])

  const toggleCam = useCallback(async () => {
    setErr(null)
    const support = getLiveMediaSupport()
    if (!support.ok) {
      setErr(support.reason || "Sin cámara")
      return
    }
    try {
      const next = !localParticipant.isCameraEnabled
      await localParticipant.setCameraEnabled(next, next ? { facingMode: facing } : undefined)
      setCamOn(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo usar la cámara")
    }
  }, [localParticipant, facing])

  const flipCamera = useCallback(async () => {
    setErr(null)
    const support = getLiveMediaSupport()
    if (!support.ok) {
      setErr(support.reason || "Sin cámara")
      return
    }
    if (flipping) return
    setFlipping(true)
    try {
      const nextFacing: "user" | "environment" =
        facing === "user" ? "environment" : "user"
      const pub = localParticipant.getTrackPublication(Track.Source.Camera)
      const track = pub?.track as LocalVideoTrack | undefined

      if (track && localParticipant.isCameraEnabled) {
        await track.restartTrack({ facingMode: nextFacing })
      } else {
        await localParticipant.setCameraEnabled(true, { facingMode: nextFacing })
        setCamOn(true)
      }
      setFacing(nextFacing)
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "No se pudo cambiar de cámara. En escritorio puede haber una sola."
      )
    } finally {
      setFlipping(false)
    }
  }, [localParticipant, facing, flipping])

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        onClick={() => void toggleMic()}
        className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md active:scale-95"
        aria-label={micOn ? "Silenciar micrófono" : "Activar micrófono"}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={() => void toggleCam()}
        className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md active:scale-95"
        aria-label={camOn ? "Apagar cámara" : "Encender cámara"}
      >
        {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={() => void flipCamera()}
        disabled={flipping}
        className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md active:scale-95 disabled:opacity-50"
        aria-label={
          facing === "user" ? "Cambiar a cámara trasera" : "Cambiar a cámara frontal"
        }
      >
        <SwitchCamera className={cn("h-5 w-5", flipping && "animate-spin")} />
      </button>
      <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
        {facing === "user" ? "Frontal" : "Trasera"}
      </span>
      {err ? (
        <p className="max-w-[9rem] rounded-xl bg-red-600/90 px-2 py-1.5 text-center text-[10px] leading-snug text-white">
          {err}
        </p>
      ) : null}
    </div>
  )
}

/** Mute del audio de la transmisión (solo viewer), estilo Instagram. */
export function ViewerMuteButton({
  muted,
  onToggle,
  className,
}: {
  muted: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md active:scale-95",
        className
      )}
      aria-label={muted ? "Activar sonido" : "Silenciar"}
      aria-pressed={muted}
    >
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  )
}

export function LiveRoomShell({
  token,
  serverUrl,
  isHost,
  hostIdentity,
  liveId,
  className,
  onDisconnected,
  onRetry,
  children,
  sideControls,
  roomKey,
  initialFacingMode = "user",
}: {
  token: string
  serverUrl: string
  isHost: boolean
  hostIdentity: string
  liveId?: string
  className?: string
  onDisconnected?: () => void
  onRetry?: () => void
  children?: React.ReactNode
  sideControls?: React.ReactNode
  roomKey?: string | number
  /** Preferencia de cámara al publicar (desde el preview). */
  initialFacingMode?: "user" | "environment"
}) {
  const connectOptions = useMemo(() => ({ autoSubscribe: true }), [])
  const media = useMemo(() => getLiveMediaSupport(), [])
  const publishMedia = isHost && media.ok
  const [viewerMuted, setViewerMuted] = useState(false)
  const videoCapture = useMemo(
    () => (publishMedia ? { facingMode: initialFacingMode } : false),
    [publishMedia, initialFacingMode]
  )

  return (
    <LiveKitRoom
      key={roomKey}
      token={token}
      serverUrl={serverUrl}
      connect
      video={videoCapture}
      audio={publishMedia}
      connectOptions={connectOptions}
      onDisconnected={onDisconnected}
      className={cn("relative h-full w-full overflow-hidden bg-black", className)}
      data-lk-theme="default"
    >
      <LiveStage isHost={isHost} mediaOk={media.ok} mediaReason={media.reason} />
      <RoomAudioRenderer volume={isHost || !viewerMuted ? 1 : 0} />
      <LiveConnectionOverlay isHost={isHost} onRetry={onRetry} />
      <LiveViewerCountBadge
        hostIdentity={hostIdentity}
        liveId={liveId}
        isHost={isHost}
        className="absolute right-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-40"
      />
      {/* Reacciones: viewer a la derecha; host un poco más arriba para no tapar cam/mic */}
      <LiveReactions
        className={cn(
          "absolute right-3 z-40",
          isHost
            ? "bottom-[min(58vh,30rem)]"
            : "bottom-[min(52vh,27rem)]"
        )}
      />
      {!isHost ? (
        <div className="pointer-events-auto absolute bottom-[min(42vh,22rem)] right-3 z-40 flex flex-col items-center gap-2">
          <ViewerMuteButton
            muted={viewerMuted}
            onToggle={() => setViewerMuted((m) => !m)}
          />
          {viewerMuted ? (
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
              Sin sonido
            </span>
          ) : null}
        </div>
      ) : null}
      {sideControls ? (
        <div className="pointer-events-auto absolute bottom-[min(42vh,22rem)] right-3 z-40 flex flex-col items-center">
          {sideControls}
        </div>
      ) : null}
      {children}
    </LiveKitRoom>
  )
}

export function LiveHostControlsSlot() {
  return <HostSideControls />
}
