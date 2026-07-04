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
        "home-section py-12 md:py-14",
        variant === "tinted" && "bg-gradient-to-b from-purple-50/60 to-transparent",
        variant === "elevated" && "bg-white shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="container mx-auto px-4 md:px-6">{children}</div>
    </section>
  )
}
