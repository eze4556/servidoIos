"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { BookOpen, CheckCircle2, ChevronRight, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TUTORIAL_SECTIONS } from "@/components/tutorial/tutorial-sections"
import { useTutorial } from "@/components/tutorial/tutorial-provider"
import type { TutorialAudience } from "@/lib/tutorial/storage"

export function AppTutorialDialog() {
  const t = useTranslations("appTutorial")
  const { open, audience, closeTutorial, openTutorial } = useTutorial()
  const [active, setActive] = useState<TutorialAudience>(audience)

  useEffect(() => {
    if (open) setActive(audience)
  }, [open, audience])

  const section = TUTORIAL_SECTIONS.find((item) => item.id === active) || TUTORIAL_SECTIONS[0]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeTutorial()}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,720px)] w-[calc(100%-1.25rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl",
          "bg-white [&>button]:hidden"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700 px-5 pb-4 pt-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-100">
                <BookOpen className="h-3.5 w-3.5" />
                {t("badge")}
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">{t("title")}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-purple-100/90">{t("subtitle")}</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => closeTutorial()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/25"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="shrink-0 border-b border-gray-100 bg-slate-50/80 px-3 py-3 sm:w-44 sm:border-b-0 sm:border-r sm:py-4">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {t("sectionsLabel")}
            </p>
            <div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
              {TUTORIAL_SECTIONS.map((item) => {
                const Icon = item.icon
                const selected = item.id === active
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActive(item.id)
                      openTutorial(item.id)
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "bg-servido-950 text-white shadow-md shadow-purple-200"
                        : "text-slate-600 hover:bg-white hover:text-servido-900"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap font-medium">{t(`sections.${item.id}.label`)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
            <h3 className="text-base font-bold text-servido-950">{t(`sections.${active}.title`)}</h3>
            <p className="mt-1 text-sm text-slate-500">{t(`sections.${active}.intro`)}</p>

            <ul className="mt-4 space-y-3">
              {section.steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <li
                    key={step.key}
                    className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-servido-100 text-servido-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        <span className="mr-1.5 text-servido-700">{index + 1}.</span>
                        {t(`steps.${step.key}.title`)}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-slate-600">
                        {t(`steps.${step.key}.body`)}
                      </p>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {t("hintReopen")}
          </p>
          <Button
            type="button"
            onClick={() => closeTutorial({ markSeen: true })}
            className="h-11 rounded-full bg-servido-950 px-6 font-semibold hover:bg-servido-800"
          >
            {t("gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
