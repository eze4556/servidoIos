import { Suspense } from "react"
import { RestaurantDetail } from "../restaurant-detail"

/** Ruta de la web: /restaurantes/abc. Ver la nota en product/[id]/page.tsx. */
export default function RestaurantPage() {
  return (
    <Suspense fallback={null}>
      <RestaurantDetail />
    </Suspense>
  )
}
