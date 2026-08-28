import { Suspense } from "react"
import { ClaimDetailScreen } from "../claim-detail"

/** Ruta de la web: /dashboard/claims/abc. Ver la nota en product/[id]/page.tsx. */
export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimDetailScreen />
    </Suspense>
  )
}
