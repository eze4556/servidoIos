"use client"

import { BadgeCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

type ServidoOfficialLabelProps = {
  className?: string
  nameClassName?: string
  iconClassName?: string
  /** En header oscuro del chat */
  inverted?: boolean
}

export function ServidoOfficialLabel({
  className,
  nameClassName,
  iconClassName,
  inverted = false,
}: ServidoOfficialLabelProps) {
  const t = useTranslations("chat")

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className={cn("truncate font-semibold", nameClassName)}>{t("servidoOfficialName")}</span>
      <BadgeCheck
        className={cn(
          "h-4 w-4 shrink-0 fill-purple-600 text-white",
          inverted && "fill-purple-400 text-white",
          iconClassName
        )}
        strokeWidth={2.5}
        aria-label={t("servidoVerifiedAria")}
      />
    </span>
  )
}
