"use client"
import { useTranslations } from "next-intl"
import { useSafety } from "@/contexts/safety-context"
import { ContentSafety } from "@/components/safety/content-safety"
export function BlockedUsers() {
  const t = useTranslations("safety")
  const { blockedIds } = useSafety()
  return <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-semibold">{t("blockedUsers")}</h2>
    {blockedIds.length === 0 ? <p className="text-sm text-slate-600">{t("noBlocks")}</p> : blockedIds.map((id, index) => <div key={id} className="flex items-center justify-between gap-3"><span>{t("blockedNumber", { number: index + 1 })}</span><ContentSafety kind="user" targetId={id} authorId={id} /></div>)}
  </section>
}
