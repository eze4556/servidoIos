import { Suspense } from "react"
import ProximamenteContent from "./proximamente-content"

export default function ProximamentePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-gray-500">Cargando...</p>
        </div>
      }
    >
      <ProximamenteContent />
    </Suspense>
  )
}
