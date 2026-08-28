import { Suspense } from "react"
import { CategoryDetail } from "./category-detail"

/**
 * Entrada por query (/category?id=abc). Es la que usa el APK, donde el export
 * estático no puede generar rutas con ids desconocidos en tiempo de build.
 */
export default function CategoryByQueryPage() {
  return (
    <Suspense fallback={null}>
      <CategoryDetail />
    </Suspense>
  )
}
