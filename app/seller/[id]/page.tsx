import { Suspense } from "react"
import { SellerProfile } from "../seller-profile"

/** Ruta de la web: /seller/abc. Ver la nota en product/[id]/page.tsx. */
export default function SellerPage() {
  return (
    <Suspense fallback={null}>
      <SellerProfile />
    </Suspense>
  )
}
