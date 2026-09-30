"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Mic, MicOff, SwitchCamera, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLiveMediaSupport } from "@/lib/live-media"

export type LiveFacingMode = "user" | "environment"

type LivePreviewProps = {
  className?: string
  facing: LiveFacingMode
  onFacingChange: (facing: LiveFacingMode) => void
  /** Espejo solo en frontal (como Instagram). */
  mirrorFront?: boolean
}

/**
 * Preview local de cámara/mic antes de conectar a LiveKit.
 * La frontal se muestra en espejo; al salir hay que stop() el stream.
 */
export function LiveCameraPreview({
  className,
  facing,
  onFacingChange,
  mirrorFront = true,
}: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [flipping, setFlipping] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startStream = useCallback(
    async (nextFacing: LiveFacingMode, withMic: boolean) => {
      const support = getLiveMediaSupport()
      if (!support.ok) {
        setError(support.reason || "Sin cámara")
        setReady(false)
        return
      }

      setError(null)
      stopStream()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: withMic,
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setReady(true)
      } catch (e) {
        setReady(false)
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo abrir la cámara. Revisá los permisos."
        )
      }
    },
    [stopStream]
  )

  useEffect(() => {
    void startStream(facing, micOn)
    return () => stopStream()
    // Solo al montar / desmontar: flips y mic se manejan aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flip = useCallback(async () => {
    if (flipping) return
    setFlipping(true)
    const next: LiveFacingMode = facing === "user" ? "environment" : "user"
    onFacingChange(next)
    await startStream(next, micOn)
    setFlipping(false)
  }, [facing, flipping, micOn, onFacingChange, startStream])

  const toggleMic = useCallback(async () => {
    const next = !micOn
    setMicOn(next)
    const stream = streamRef.current
    if (stream) {
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        audioTracks.forEach((t) => {
          t.enabled = next
        })
        return
      }
    }
    await startStream(facing, next)
  }, [micOn, facing, startStream])

  const mirrored = mirrorFront && facing === "user"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] bg-black shadow-lg ring-1 ring-servido-950/10",
        className
      )}
    >
      <div className="relative aspect-[9/16] w-full max-h-[min(62vh,520px)]">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            "h-full w-full object-cover",
            mirrored && "scale-x-[-1]"
          )}
        />
        {!ready && !error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Abriendo cámara…</p>
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 px-4 text-center text-white">
            <VideoOff className="h-10 w-10 opacity-70" />
            <p className="text-sm leading-relaxed text-white/85">{error}</p>
            <button
              type="button"
              className="mt-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-servido-950"
              onClick={() => void startStream(facing, micOn)}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-3">
          <p className="text-center text-xs font-medium text-white/90">
            Preview · {facing === "user" ? "Frontal (espejo)" : "Trasera"}
          </p>
        </div>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleMic()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-md"
            aria-label={micOn ? "Silenciar micrófono" : "Activar micrófono"}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => void flip()}
            disabled={flipping}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-md disabled:opacity-50"
            aria-label="Cambiar cámara"
          >
            <SwitchCamera className={cn("h-5 w-5", flipping && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Detiene cualquier stream residual del elemento video (por si el padre necesita liberar la cámara). */
export function stopAllMediaTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop())
}
