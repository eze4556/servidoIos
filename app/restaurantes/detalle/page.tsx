import { Suspense } from "react"
import { RestaurantDetail } from "../restaurant-detail"

/**
 * Entrada por query (/restaurantes/detalle?id=abc) que usa el APK. Va en un
 * sub-segmento porque /restaurantes ya es la pantalla de listado.
 */
export default function RestaurantByQueryPage() {
  return (
    <Suspense fallback={null}>
      <RestaurantDetail />
    </Suspense>
  )
}
