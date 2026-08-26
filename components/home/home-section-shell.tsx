import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface HomeSectionShellProps {
  children: ReactNode
  variant?: "default" | "tinted" | "elevated"
  className?: string
}

export function HomeSectionShell({ children, variant = "default", className }: HomeSectionShellProps) {
  return (
    <section
      className={cn(
        "home-section py-12 md:py-16",
        variant === "tinted" && "bg-gradient-to-b from-servido-950/[0.03] via-purple-50/40 to-transparent",
        variant === "elevated" && "bg-white/80 shadow-[inset_0_1px_0_0_rgba(46,16,101,0.06)]",
        className
      )}
    >
      <div className="container mx-auto max-w-screen-xl px-6 xl:px-8">{children}</div>
    </section>
  )
}
