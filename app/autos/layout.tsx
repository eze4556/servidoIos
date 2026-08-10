import type { ReactNode } from "react"

import { VehiclesEnterEffects } from "@/components/vehicles/vehicles-enter-effects"



export default function AutosLayout({ children }: { children: ReactNode }) {

  return (

    <div className="vehicles-vertical relative min-h-full w-full bg-gradient-to-b from-servido-950 via-servido-900 to-servido-950">

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(124,58,237,0.35),transparent)]" />

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_40%_30%_at_100%_50%,rgba(255,255,255,0.04),transparent)]" />

      <VehiclesEnterEffects />

      <div className="relative vehicles-animate-in">{children}</div>

    </div>

  )

}

