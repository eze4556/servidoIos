import type { ReactNode } from "react"
import { VehiclesEnterEffects } from "@/components/vehicles/vehicles-enter-effects"

export default function AutosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vehicles-vertical relative min-h-full w-full bg-gradient-to-b from-purple-50 via-[#f6f3fb] to-[#f3f5f7]">
      <VehiclesEnterEffects />
      {children}
    </div>
  )
}
