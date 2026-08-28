import { Suspense } from "react"
import { PropertyDetail } from "../property-detail"

/** Ruta de la web: /propiedades/abc. Ver la nota en product/[id]/page.tsx. */
export default function PropertyPage() {
  return (
    <Suspense fallback={null}>
      <PropertyDetail />
    </Suspense>
  )
}
