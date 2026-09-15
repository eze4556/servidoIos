"use client"

import { BookOpen } from "lucide-react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useTutorial } from "@/components/tutorial/tutorial-provider"
import { cn } from "@/lib/utils"

/**
 * Botón flotante siempre visible (salvo auth/admin) para reabrir el tutorial.
 */
export function TutorialFab() {
  const t = useTranslations("appTutorial")
  const { openTutorial } = useTutorial()
  const pathname = usePathname()

  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/chat")
  ) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => openTutorial()}
      className={cn(
        "fixed z-[55] flex items-center gap-2 rounded-full bg-servido-950 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 ring-1 ring-white/10",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 lg:bottom-6 lg:right-24",
        "hover:bg-servido-800 active:scale-[0.98]"
      )}
      aria-label={t("fabAria")}
    >
      <BookOpen className="h-4 w-4" />
      <span className="hidden sm:inline">{t("fabLabel")}</span>
      <span className="sm:hidden">{t("fabShort")}</span>
    </button>
  )
}
