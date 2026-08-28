/**
 * Resuelve la URL de las rutas de API según dónde corre el código.
 *
 * En la web las rutas viven en el mismo origen, así que alcanza el path
 * relativo. Dentro del APK no hay servidor: el WebView sirve los archivos desde
 * https://localhost, así que un fetch a "/api/x" pegaría contra el propio
 * bundle y fallaría. Ahí hay que apuntar al backend real en Vercel.
 *
 * Usar siempre apiUrl() en lugar de escribir "/api/..." directo en un fetch.
 */
const isApp = process.env.NEXT_PUBLIC_CAPACITOR === "1"

function resolveBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim()
  if (!raw) return ""
  try {
    return new URL(raw).origin
  } catch {
    return raw.replace(/\/+$/, "")
  }
}

/** Vacío en la web (mismo origen); origen absoluto del backend en el APK. */
export const API_BASE = isApp ? resolveBase() : ""

export function apiUrl(path: string): string {
  if (!API_BASE) return path
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
}
