"use client"

import { useParams, useSearchParams } from "next/navigation"

/**
 * Lee el identificador de la ruta tanto del path (/product/abc) como del query
 * (/product?id=abc).
 *
 * La web usa el path: son URLs limpias, indexables y aptas para previews al
 * compartir. El APK usa el query porque `output: "export"` sólo puede generar
 * rutas conocidas en tiempo de build, y los ids de productos y vendedores son
 * contenido de usuarios: infinitos y cambiantes.
 */
export function useRouteId(key = "id"): string | undefined {
  const params = useParams()
  const searchParams = useSearchParams()

  const fromPath = params?.[key]
  const pathValue = Array.isArray(fromPath) ? fromPath[0] : fromPath
  if (pathValue) return pathValue

  return searchParams.get(key) ?? undefined
}
