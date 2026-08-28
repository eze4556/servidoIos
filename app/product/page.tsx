import { Suspense } from "react"
import { ProductDetail } from "./product-detail"

/** Entrada por query (/product?id=abc) que usa el APK. */
export default function ProductByQueryPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetail />
    </Suspense>
  )
}
