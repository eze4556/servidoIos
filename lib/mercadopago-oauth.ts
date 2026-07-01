import { randomUUID } from "crypto"
import { auth as adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { getMercadoPagoConnectionSnapshot } from "@/lib/mercadopago-connection"

type MercadoPagoOAuthTokenResponse = {
  access_token: string
  token_type?: string
  expires_in?: number
  scope?: string
  user_id?: number | string
  refresh_token?: string
  public_key?: string
  live_mode?: boolean
}

type OAuthStateRecord = {
  userId: string
  redirectUri: string
  createdAt: Date
  expiresAt: Date
}

const OAUTH_STATE_COLLECTION = "mercadopagoOAuthStates"
const CALLBACK_PATH = "/api/mercadopago/connect/callback"
const TOKEN_ENDPOINT = "https://api.mercadopago.com/oauth/token"
const AUTHORIZATION_ENDPOINT = "https://auth.mercadopago.com/authorization"

function getConfiguredAppOrigin(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      return configured.replace(/\/+$/, "")
    }
  }

  if (request) {
    return new URL(request.url).origin
  }

  throw new Error("NEXT_PUBLIC_APP_URL no está configurado")
}

function getMercadoPagoConfig() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID?.trim()
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error("MERCADOPAGO_CLIENT_ID o MERCADOPAGO_CLIENT_SECRET no están configurados")
  }

  return { clientId, clientSecret }
}

function buildAuthorizationUrl(params: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL(AUTHORIZATION_ENDPOINT)
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("platform_id", "mp")
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("state", params.state)
  return url.toString()
}

async function postOAuthToken(body: Record<string, string>) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.message || payload?.error_description || payload?.error || "No se pudo conectar con Mercado Pago"
    throw new Error(message)
  }

  return payload as MercadoPagoOAuthTokenResponse
}

function parseDateLike(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

async function requireAuthenticatedUserId(request: Request) {
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("No autorizado")
  }

  const decodedToken = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
  return decodedToken.uid
}

async function readStoredConnection(userId: string) {
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) {
    return null
  }

  return userDoc.data() as any
}

export async function createMercadoPagoConnectUrl(request: Request) {
  const userId = await requireAuthenticatedUserId(request)
  const { clientId } = getMercadoPagoConfig()
  const redirectUri = `${getConfiguredAppOrigin(request)}${CALLBACK_PATH}`
  const state = randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  const stateRecord: OAuthStateRecord = {
    userId,
    redirectUri,
    createdAt: new Date(),
    expiresAt,
  }

  await setDoc(doc(db, OAUTH_STATE_COLLECTION, state), stateRecord, { merge: false })

  return {
    state,
    redirectUri,
    authorizationUrl: buildAuthorizationUrl({
      clientId,
      redirectUri,
      state,
    }),
  }
}

export async function completeMercadoPagoConnection(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description")

  if (error) {
    throw new Error(errorDescription || error || "No se pudo conectar Mercado Pago")
  }

  if (!code || !state) {
    throw new Error("Faltan parámetros de conexión")
  }

  const stateDoc = await getDoc(doc(db, OAUTH_STATE_COLLECTION, state))
  if (!stateDoc.exists()) {
    throw new Error("Estado de conexión inválido o expirado")
  }

  const stateData = stateDoc.data() as OAuthStateRecord
  const stateExpiresAt = parseDateLike(stateData.expiresAt)
  if (stateExpiresAt && stateExpiresAt.getTime() <= Date.now()) {
    await deleteDoc(doc(db, OAUTH_STATE_COLLECTION, state))
    throw new Error("El estado de conexión expiró")
  }

  const tokenResponse = await postOAuthToken({
    grant_type: "authorization_code",
    client_id: getMercadoPagoConfig().clientId,
    client_secret: getMercadoPagoConfig().clientSecret,
    code,
    redirect_uri: stateData.redirectUri,
  })

  const previousConnection = await readStoredConnection(stateData.userId)
  const existingMercadoPago = previousConnection?.mercadopago || {}
  const connectedAt = existingMercadoPago?.connected_at || new Date()
  const expiresAt = new Date(Date.now() + Number(tokenResponse.expires_in || 0) * 1000)

  await setDoc(
    doc(db, "users", stateData.userId),
    {
      mercadopagoConnected: true,
      mpConnected: true,
      mercadopagoAccountId: String(tokenResponse.user_id || existingMercadoPago?.user_id || stateData.userId),
      mercadopagoUserId: String(tokenResponse.user_id || existingMercadoPago?.user_id || stateData.userId),
      mercadopagoExpiresAt: expiresAt,
      mercadopago: {
        connected: true,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || existingMercadoPago?.refresh_token || null,
        token_type: tokenResponse.token_type || existingMercadoPago?.token_type || "bearer",
        expires_in: tokenResponse.expires_in ?? existingMercadoPago?.expires_in ?? null,
        expires_at: expiresAt,
        scope: tokenResponse.scope || existingMercadoPago?.scope || null,
        user_id: String(tokenResponse.user_id || existingMercadoPago?.user_id || stateData.userId),
        public_key: tokenResponse.public_key || existingMercadoPago?.public_key || null,
        live_mode: typeof tokenResponse.live_mode === "boolean" ? tokenResponse.live_mode : existingMercadoPago?.live_mode ?? null,
        connected_at: connectedAt,
        updated_at: new Date(),
      },
      updatedAt: new Date(),
    },
    { merge: true }
  )

  await deleteDoc(doc(db, OAUTH_STATE_COLLECTION, state))

  const updatedDoc = await getDoc(doc(db, "users", stateData.userId))
  return {
    userId: stateData.userId,
    status: getMercadoPagoConnectionSnapshot(updatedDoc.exists() ? (updatedDoc.data() as any) : null).status,
  }
}

export async function disconnectMercadoPagoConnection(request: Request) {
  const userId = await requireAuthenticatedUserId(request)
  await setDoc(
    doc(db, "users", userId),
    {
      mercadopagoConnected: false,
      mpConnected: false,
      mercadopagoAccountId: null,
      mercadopagoUserId: null,
      mercadopagoExpiresAt: null,
      mercadopago: null,
      updatedAt: new Date(),
    },
    { merge: true }
  )

  return {
    userId,
    connected: false,
  }
}

export async function refreshMercadoPagoConnectionToken(userId: string) {
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) {
    throw new Error("Vendedor no encontrado")
  }

  const userData = userDoc.data() as any
  const connectionSource = userData?.mercadopago || {}
  const refreshToken = connectionSource?.refresh_token || userData?.mercadopagoRefreshToken

  if (!refreshToken) {
    throw new Error("El vendedor debe conectar su cuenta de Mercado Pago para cobrar")
  }

  const tokenResponse = await postOAuthToken({
    grant_type: "refresh_token",
    client_id: getMercadoPagoConfig().clientId,
    client_secret: getMercadoPagoConfig().clientSecret,
    refresh_token: refreshToken,
  })

  const expiresAt = new Date(Date.now() + Number(tokenResponse.expires_in || 0) * 1000)
  await setDoc(
    doc(db, "users", userId),
    {
      mercadopagoConnected: true,
      mpConnected: true,
      mercadopagoAccountId: String(tokenResponse.user_id || connectionSource?.user_id || userId),
      mercadopagoUserId: String(tokenResponse.user_id || connectionSource?.user_id || userId),
      mercadopagoExpiresAt: expiresAt,
      mercadopago: {
        connected: true,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || refreshToken,
        token_type: tokenResponse.token_type || connectionSource?.token_type || "bearer",
        expires_in: tokenResponse.expires_in ?? connectionSource?.expires_in ?? null,
        expires_at: expiresAt,
        scope: tokenResponse.scope || connectionSource?.scope || null,
        user_id: String(tokenResponse.user_id || connectionSource?.user_id || userId),
        public_key: tokenResponse.public_key || connectionSource?.public_key || null,
        live_mode: typeof tokenResponse.live_mode === "boolean" ? tokenResponse.live_mode : connectionSource?.live_mode ?? null,
        connected_at: connectionSource?.connected_at || new Date(),
        updated_at: new Date(),
      },
      updatedAt: new Date(),
    },
    { merge: true }
  )

  const refreshedDoc = await getDoc(doc(db, "users", userId))
  return getMercadoPagoConnectionSnapshot(refreshedDoc.exists() ? (refreshedDoc.data() as any) : null)
}

export async function getMercadoPagoConnectionRecord(userId: string) {
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) {
    return null
  }

  const userData = userDoc.data() as any
  return {
    userData,
    snapshot: getMercadoPagoConnectionSnapshot(userData),
  }
}

export async function ensureMercadoPagoSellerConnection(userId: string) {
  const record = await getMercadoPagoConnectionRecord(userId)
  if (!record) {
    throw new Error("El vendedor debe conectar su cuenta de Mercado Pago para cobrar")
  }

  if (record.snapshot.connected) {
    return record.snapshot
  }

  const connectionSource = record.userData?.mercadopago || {}
  const hasRefreshToken = Boolean(connectionSource?.refresh_token || record.userData?.mercadopagoRefreshToken)
  if (!hasRefreshToken) {
    throw new Error("El vendedor debe conectar su cuenta de Mercado Pago para cobrar")
  }

  return refreshMercadoPagoConnectionToken(userId)
}

export async function getMercadoPagoSellerAccessToken(userId: string) {
  const record = await getMercadoPagoConnectionRecord(userId)
  if (!record) {
    throw new Error("El vendedor debe conectar su cuenta de Mercado Pago para cobrar")
  }

  const connectionSource = record.userData?.mercadopago || {}
  const accessToken = connectionSource?.access_token
  if (record.snapshot.connected && accessToken) {
    return accessToken as string
  }

  const refreshedSnapshot = await ensureMercadoPagoSellerConnection(userId)
  const refreshedRecord = await getMercadoPagoConnectionRecord(userId)
  const refreshedAccessToken = refreshedRecord?.userData?.mercadopago?.access_token

  if (!refreshedAccessToken || !refreshedSnapshot.connected) {
    throw new Error("El vendedor debe conectar su cuenta de Mercado Pago para cobrar")
  }

  return refreshedAccessToken as string
}
