import type { ReactNode } from "react"

export default function PropiedadesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full w-full bg-gradient-to-b from-purple-50 via-[#f6f3fb] to-[#f3f5f7]">
      {children}
    </div>
  )
}
