export type MercadoPagoConnectionStatus = "connected" | "not_connected" | "token_expired"

export interface MercadoPagoConnectionSnapshot {
  status: MercadoPagoConnectionStatus
  connected: boolean
  tokenExpired: boolean
  expiresAt: Date | null
  connectedAt: Date | null
  updatedAt: Date | null
  accountId: string | null
  userId: string | null
}

function parseDateLike(value: unknown): Date | null {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function getConnectionSource(userData: any) {
  return (
    userData?.mercadopago ||
    userData?.mercadoPago ||
    userData?.mercadopagoConnection ||
    userData?.mpConnection ||
    null
  )
}

function normalizeExplicitStatus(value: unknown): MercadoPagoConnectionStatus | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "connected" || normalized === "active" || normalized === "ok") {
    return "connected"
  }
  if (normalized === "expired" || normalized === "token_expired" || normalized === "vence" || normalized === "vencido") {
    return "token_expired"
  }
  if (normalized === "not_connected" || normalized === "inactive" || normalized === "disconnected") {
    return "not_connected"
  }
  return null
}

export function getMercadoPagoConnectionSnapshot(userData: any): MercadoPagoConnectionSnapshot {
  const connectionSource = getConnectionSource(userData)
  const expiresAt = parseDateLike(
    connectionSource?.expires_at ||
      connectionSource?.expiresAt ||
      userData?.mercadopagoExpiresAt ||
      userData?.mercadopagoAccessTokenExpiresAt ||
      userData?.mercadopagoConnectionExpiresAt
  )
  const connectedAt = parseDateLike(
    connectionSource?.connected_at ||
      connectionSource?.connectedAt ||
      userData?.mercadopagoConnectedAt ||
      userData?.mercadopagoConnectionCreatedAt
  )
  const updatedAt = parseDateLike(
    connectionSource?.updated_at ||
      connectionSource?.updatedAt ||
      userData?.mercadopagoUpdatedAt ||
      userData?.mercadopagoConnectionUpdatedAt
  )

  const explicitStatus =
    normalizeExplicitStatus(connectionSource?.status) ||
    normalizeExplicitStatus(userData?.mercadopagoStatus) ||
    normalizeExplicitStatus(userData?.mpStatus) ||
    null

  const tokenExpired = Boolean(expiresAt && expiresAt.getTime() <= Date.now())
  const hasConnectionData = Boolean(
    userData?.mercadopagoConnected ||
      userData?.mpConnected ||
      userData?.mercadopagoConnectionConnected ||
      connectionSource?.connected === true ||
      connectionSource?.access_token ||
      connectionSource?.refresh_token ||
      connectionSource?.user_id ||
      connectionSource?.userId
  )

  let status: MercadoPagoConnectionStatus = "not_connected"
  if (hasConnectionData) {
    status = tokenExpired ? "token_expired" : "connected"
  }

  if (explicitStatus) {
    status = explicitStatus
    if (explicitStatus === "connected" && tokenExpired) {
      status = "token_expired"
    }
  }

  return {
    status,
    connected: status === "connected",
    tokenExpired,
    expiresAt,
    connectedAt,
    updatedAt,
    accountId:
      String(
        connectionSource?.user_id ||
          connectionSource?.userId ||
          userData?.mercadopagoAccountId ||
          userData?.mercadopagoUserId ||
          ""
      ) || null,
    userId:
      String(
        userData?.mercadopagoUserId ||
          userData?.mercadopagoAccountId ||
          connectionSource?.user_id ||
          connectionSource?.userId ||
          ""
      ) || null,
  }
}

export function isMercadoPagoConnectionActive(userData: any): boolean {
  return getMercadoPagoConnectionSnapshot(userData).connected
}

