"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import "@livekit/components-styles"
import { Mic, MicOff, Video, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLiveMediaSupport } from "@/lib/live-media"

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
  const participants = useParticipants()

  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera && t.publication?.track
  )

  const hostTrack =
    cameraTracks.find((t) => t.participant.isLocal && isHost) ||
    cameraTracks.find((t) => !t.participant.isLocal) ||
    cameraTracks[0]

  const viewerLabel = Math.max(0, participants.length)

  return (
    <div className="relative h-full w-full bg-black">
      {hostTrack?.publication?.track ? (
        <VideoTrack trackRef={hostTrack} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <VideoOff className="h-12 w-12 opacity-70" />
          <p className="text-base font-medium">
            {isHost
              ? mediaOk
                ? "Encendé la cámara para transmitir"
                : "Sin acceso a la cámara"
              : "Esperando que el vendedor encienda la cámara…"}
          </p>
          {isHost && mediaReason ? (
            <p className="max-w-sm text-sm leading-relaxed text-amber-200/95">{mediaReason}</p>
          ) : null}
        </div>
      )}

      <div className="pointer-events-none absolute right-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        👁 {viewerLabel}
      </div>
    </div>
  )
}

export function HostSideControls({ className }: { className?: string }) {
  const { localParticipant } = useLocalParticipant()
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setMicOn(localParticipant.isMicrophoneEnabled)
    setCamOn(localParticipant.isCameraEnabled)
  }, [localParticipant.isMicrophoneEnabled, localParticipant.isCameraEnabled])

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
      await localParticipant.setCameraEnabled(next)
      setCamOn(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo usar la cámara")
    }
  }, [localParticipant])

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        onClick={() => void toggleMic()}
        className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md active:scale-95"
        aria-label={micOn ? "Silenciar" : "Activar mic"}
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
      {err ? (
        <p className="max-w-[9rem] rounded-xl bg-red-600/90 px-2 py-1.5 text-center text-[10px] leading-snug text-white">
          {err}
        </p>
      ) : null}
    </div>
  )
}

export function LiveRoomShell({
  token,
  serverUrl,
  isHost,
  className,
  onDisconnected,
  children,
  sideControls,
}: {
  token: string
  serverUrl: string
  isHost: boolean
  className?: string
  onDisconnected?: () => void
  children?: React.ReactNode
  /** Controles del host (derecha), estilo TikTok */
  sideControls?: React.ReactNode
}) {
  const connectOptions = useMemo(() => ({ autoSubscribe: true }), [])
  const media = useMemo(() => getLiveMediaSupport(), [])
  const publishMedia = isHost && media.ok

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={publishMedia}
      audio={publishMedia}
      connectOptions={connectOptions}
      onDisconnected={onDisconnected}
      className={cn("relative h-full w-full overflow-hidden bg-black", className)}
      data-lk-theme="default"
    >
      <LiveStage isHost={isHost} mediaOk={media.ok} mediaReason={media.reason} />
      <RoomAudioRenderer />
      {sideControls ? (
        <div className="pointer-events-auto absolute bottom-[min(42vh,22rem)] right-3 z-40 flex flex-col items-center">
          {sideControls}
        </div>
      ) : null}
      {children}
    </LiveKitRoom>
  )
}

/** Para usar HostSideControls hace falta estar dentro de LiveKitRoom */
export function LiveHostControlsSlot() {
  return <HostSideControls />
}
