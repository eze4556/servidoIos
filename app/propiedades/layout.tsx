import type { ReactNode } from "react"

export default function PropiedadesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vehicles-vertical relative min-h-full w-full bg-gradient-to-b from-[#1e1b4b] via-servido-950 to-servido-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(99,102,241,0.28),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_40%_30%_at_100%_50%,rgba(255,255,255,0.04),transparent)]" />
      <div className="relative vehicles-animate-in">{children}</div>
    </div>
  )
}
