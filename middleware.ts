import { NextResponse, type NextRequest } from "next/server"

/**
 * Habilita CORS en las rutas de API para que las pueda consumir el APK.
 *
 * En la web esto no hace falta: el front y la API comparten origen. Dentro del
 * WebView de Capacitor el documento se sirve desde https://localhost (o
 * capacitor://localhost en iOS), así que cada llamada al backend es
 * cross-origin y el navegador la bloquea sin estos headers.
 *
 * Se usa una lista fija en vez de "*" para no abrir la API a cualquier sitio.
 * La autenticación viaja en el header Authorization, no en cookies, así que no
 * se habilita Allow-Credentials.
 */
const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
])

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers()
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    headers.set("Access-Control-Max-Age", "86400")
    // El origen permitido cambia según el pedido, así que las caches
    // intermedias no pueden reutilizar la respuesta entre orígenes.
    headers.set("Vary", "Origin")
  }
  return headers
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin")
  const headers = corsHeaders(origin)

  // El preflight nunca llega al route handler: se responde acá.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers })
  }

  const response = NextResponse.next()
  headers.forEach((value, key) => response.headers.set(key, value))
  return response
}

export const config = {
  matcher: "/api/:path*",
}
