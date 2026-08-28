import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface InfoSectionProps {
  title: string
  number?: number
  children: ReactNode
  className?: string
  id?: string
}

export function InfoSection({ title, number, children, className, id }: InfoSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl bg-white p-6 shadow-[0_12px_32px_-24px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 sm:p-8 lg:rounded-3xl",
        className
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {typeof number === "number" && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-servido-50 text-sm font-bold text-servido-800">
            {number}
          </span>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-servido-950 sm:text-xl">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-slate-600">
        {children}
      </div>
    </section>
  )
}
