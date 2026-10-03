import { AccessToken, RoomServiceClient } from "livekit-server-sdk"

export function getLiveKitUrl(): string {
  const url = String(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || ""
  ).trim()
  if (!url) throw new Error("Falta NEXT_PUBLIC_LIVEKIT_URL (o LIVEKIT_URL)")
  return url
}

/** RoomService usa HTTPS; el cliente WebRTC usa WSS. */
export function getLiveKitHttpUrl(): string {
  const url = getLiveKitUrl()
  return url.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:")
}

export function getLiveKitCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = String(process.env.LIVEKIT_API_KEY || "").trim()
  const apiSecret = String(process.env.LIVEKIT_API_SECRET || "").trim()
  if (!apiKey || !apiSecret) {
    throw new Error("Faltan LIVEKIT_API_KEY o LIVEKIT_API_SECRET")
  }
  return { apiKey, apiSecret }
}

export function isLiveKitConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || process.env.LIVEKIT_URL?.trim()) &&
      process.env.LIVEKIT_API_KEY?.trim() &&
      process.env.LIVEKIT_API_SECRET?.trim()
  )
}

export function getRoomService(): RoomServiceClient {
  const { apiKey, apiSecret } = getLiveKitCredentials()
  return new RoomServiceClient(getLiveKitHttpUrl(), apiKey, apiSecret)
}

export async function createLiveParticipantToken(params: {
  roomName: string
  identity: string
  name: string
  canPublish: boolean
  /** Preview del rail: sin publicar ni data channel; TTL corto. */
  preview?: boolean
}): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials()
  const preview = Boolean(params.preview)
  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: preview ? "30m" : "6h",
  })
  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: preview ? false : params.canPublish,
    canSubscribe: true,
    canPublishData: !preview,
  })
  return at.toJwt()
}
