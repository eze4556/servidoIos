import { Suspense } from "react"
import { VehicleDetail } from "../vehicle-detail"

/** Ruta de la web: /autos/abc. Ver la nota en product/[id]/page.tsx. */
export default function VehiclePage() {
  return (
    <Suspense fallback={null}>
      <VehicleDetail />
    </Suspense>
  )
}
