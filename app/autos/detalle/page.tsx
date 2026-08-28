import { Suspense } from "react"
import { VehicleDetail } from "../vehicle-detail"

/**
 * Entrada por query (/autos/detalle?id=abc) que usa el APK. Va en un
 * sub-segmento porque /autos ya es la pantalla de listado.
 */
export default function VehicleByQueryPage() {
  return (
    <Suspense fallback={null}>
      <VehicleDetail />
    </Suspense>
  )
}
