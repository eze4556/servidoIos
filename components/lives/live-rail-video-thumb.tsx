"use client"

import { useEffect, useState } from "react"
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { getLivePreviewTokenApi } from "@/lib/lives"

function RailRemoteCamera() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  )
  const remote = tracks.find(
    (t) => !t.participant.isLocal && t.publication?.track
  )
  if (!remote) return null
  return (
    <VideoTrack
      trackRef={remote}
      className="absolute inset-0 h-full w-full object-cover"
    />
  )
}

/**
 * Video silenciado del vivo para el rail (una sola sala a la vez).
 * Si falla, el padre sigue mostrando la portada estática debajo.
 */
export function LiveRailVideoThumb({ liveId }: { liveId: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setToken(null)
    setServerUrl(null)

    void getLivePreviewTokenApi(liveId)
      .then((access) => {
        if (cancelled) return
        setToken(access.token)
        setServerUrl(access.serverUrl)
      })
      .catch(() => {
        /* fallback: sin video, queda la imagen estática */
      })

    return () => {
      cancelled = true
    }
  }, [liveId])

  if (!token || !serverUrl) return null

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={false}
      video={false}
      className="absolute inset-0"
    >
      <RailRemoteCamera />
    </LiveKitRoom>
  )
}
