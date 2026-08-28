import { Suspense } from "react"
import { SellerProfile } from "./seller-profile"

/** Entrada por query (/seller?id=abc) que usa el APK. */
export default function SellerByQueryPage() {
  return (
    <Suspense fallback={null}>
      <SellerProfile />
    </Suspense>
  )
}
