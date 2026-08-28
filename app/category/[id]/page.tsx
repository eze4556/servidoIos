import { Suspense } from "react"
import { CategoryDetail } from "../category-detail"

/**
 * Ruta de la web: /category/abc, renderizada por demanda en el servidor.
 *
 * El build del APK excluye este archivo (ver scripts/build-capacitor.mjs) y llega
 * al mismo contenido por /category?id=abc. Importante: no agregar acá un
 * generateStaticParams, porque convierte la ruta en SSG y rompe la web con
 * DYNAMIC_SERVER_USAGE al leer cookies() el i18n.
 */
export default function CategoryPage() {
  return (
    <Suspense fallback={null}>
      <CategoryDetail />
    </Suspense>
  )
}
