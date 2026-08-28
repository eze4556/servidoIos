/**
 * Normaliza un path o URL de Servido a un link interno de historia.
 * Acepta: "/product/abc", "https://dominio.com/product/abc", "/restaurantes/xyz"
 */
export function normalizeStoryLink(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let path = trimmed

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed)
      path = url.pathname
    }
  } catch {
    return null
  }

  // Quitar query/hash si vino en path raro
  path = path.split("?")[0].split("#")[0]

  if (!path.startsWith("/")) {
    path = `/${path}`
  }

  // Quitar trailing slash excepto root
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1)
  }

  if (/^\/product\/[^/]+$/i.test(path) || /^\/restaurantes\/[^/]+$/i.test(path)) {
    return path
  }

  return null
}

/*
 * Estas dos funciones producen el formato con el que el link se guarda en la
 * historia, que es siempre el path de la web. La traducción a la URL de la app
 * pasa al renderizar, en resolveStoredHref, para que las historias ya guardadas
 * sigan funcionando.
 */

export function productStoryLink(productId: string): string {
  return `/product/${productId}`
}

export function restaurantStoryLink(restaurantId: string): string {
  return `/restaurantes/${restaurantId}`
}
