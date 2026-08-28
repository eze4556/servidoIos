/**
 * Constructores de URL para las pantallas de detalle.
 *
 * En la web devuelven el path (/product/abc): URL limpia, indexable y con
 * preview al compartir. En el APK devuelven el query (/product?id=abc), porque
 * `output: "export"` sólo puede generar rutas conocidas en tiempo de build y los
 * ids son contenido de usuarios.
 *
 * Usar siempre estos helpers en lugar de armar el href a mano: es lo que evita
 * que una pantalla nueva funcione en el navegador pero se rompa en la app.
 */
const useQueryRoutes = process.env.NEXT_PUBLIC_CAPACITOR === "1"

interface DetailRoute {
  /** Path de la web, que recibe el id como segmento. */
  base: string
  /**
   * Path de la app. Difiere cuando `base` ya está ocupado por una pantalla de
   * listado (restaurantes, propiedades, autos) o conviene dejarlo libre (claims).
   */
  appBase: string
  key: string
}

const detailRoutes: DetailRoute[] = [
  { base: "/product", appBase: "/product", key: "id" },
  { base: "/seller", appBase: "/seller", key: "id" },
  { base: "/category", appBase: "/category", key: "id" },
  { base: "/chat", appBase: "/chat", key: "chatId" },
  { base: "/restaurantes", appBase: "/restaurantes/detalle", key: "id" },
  { base: "/propiedades", appBase: "/propiedades/detalle", key: "id" },
  { base: "/autos", appBase: "/autos/detalle", key: "id" },
  { base: "/dashboard/claims", appBase: "/dashboard/claims/detalle", key: "id" },
]

function detailHref(base: string, id: string): string {
  const route = detailRoutes.find((r) => r.base === base)
  if (!route) throw new Error(`Ruta de detalle no registrada: ${base}`)
  const value = encodeURIComponent(id)
  return useQueryRoutes ? `${route.appBase}?${route.key}=${value}` : `${base}/${value}`
}

/**
 * Agrega parámetros a un href de detalle. Necesario porque en la app el href ya
 * trae su propio query con el id, así que no se puede concatenar "?" a ciegas.
 */
export function withParams(href: string, params: Record<string, string>): string {
  const entries = Object.entries(params)
  if (entries.length === 0) return href
  const query = new URLSearchParams(entries).toString()
  return `${href}${href.includes("?") ? "&" : "?"}${query}`
}

/**
 * Traduce un href de detalle que ya viene armado como path a la forma que
 * entiende el build actual.
 *
 * Las notificaciones guardan el link en Firestore en el momento de crearse, y lo
 * hacen desde el servidor, que siempre escribe el path. Se traduce al renderizar
 * para que el mismo dato sirva en la web y en la app, incluidas las
 * notificaciones que ya estaban guardadas.
 */
export function resolveStoredHref(href: string): string {
  if (!useQueryRoutes || !href.startsWith("/")) return href

  const [path, query] = href.split("?")
  for (const route of detailRoutes) {
    const prefix = `${route.base}/`
    if (!path.startsWith(prefix)) continue

    const id = path.slice(prefix.length)
    // Un id con "/" es en realidad una ruta más profunda, no un detalle.
    if (!id || id.includes("/")) continue

    const resolved = `${route.appBase}?${route.key}=${encodeURIComponent(id)}`
    return query ? `${resolved}&${query}` : resolved
  }
  return href
}

export const productHref = (id: string) => detailHref("/product", id)
export const sellerHref = (id: string) => detailHref("/seller", id)
export const categoryHref = (id: string) => detailHref("/category", id)
export const chatHref = (id: string) => detailHref("/chat", id)
export const restaurantHref = (id: string) => detailHref("/restaurantes", id)
export const propertyHref = (id: string) => detailHref("/propiedades", id)
export const vehicleHref = (id: string) => detailHref("/autos", id)
export const claimHref = (id: string) => detailHref("/dashboard/claims", id)
