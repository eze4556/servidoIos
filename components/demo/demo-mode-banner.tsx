"use client"

import { isDemoMode } from "@/lib/demo"

export function DemoModeBanner() {
  if (!isDemoMode) return null

  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      Modo demostración — los productos y precios son de ejemplo para la presentación.
    </div>
  )
}
