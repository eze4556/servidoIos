import { Suspense } from "react"
import { ClaimDetailScreen } from "../claim-detail"

/**
 * Entrada por query (/dashboard/claims/detalle?id=abc) que usa el APK. Va en un
 * sub-segmento para dejar /dashboard/claims libre como listado.
 */
export default function ClaimByQueryPage() {
  return (
    <Suspense fallback={null}>
      <ClaimDetailScreen />
    </Suspense>
  )
}
