import { Suspense } from "react"
import { PropertyDetail } from "../property-detail"

/**
 * Entrada por query (/propiedades/detalle?id=abc) que usa el APK. Va en un
 * sub-segmento porque /propiedades ya es la pantalla de listado.
 */
export default function PropertyByQueryPage() {
  return (
    <Suspense fallback={null}>
      <PropertyDetail />
    </Suspense>
  )
}
