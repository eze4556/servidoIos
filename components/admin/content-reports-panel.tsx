"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { safetyRequest } from "@/contexts/safety-context"
import { Button } from "@/components/ui/button"

type Report = { id: string; kind: string; targetId: string; authorId: string; reason: string; details: string; createdAt: string | null; evidence?: { title: string; text: string } }
export function ContentReportsPanel() {
  const t = useTranslations("safety")
  const [reports, setReports] = useState<Report[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function refresh() {
    setBusy(true); setError("")
    try { const data = await safetyRequest("/api/admin/content-reports", undefined, "GET"); setReports(data.reports) }
    catch { setError(t("failed")) }
    finally { setBusy(false) }
  }
  useEffect(() => { void refresh() }, [])
  async function resolve(id: string, action: string) {
    if (action !== "dismiss" && !window.confirm(t("moderationConfirm"))) return
    setBusy(true); setError("")
    try {
      await safetyRequest("/api/admin/content-reports", { reportId: id, action })
      setReports(rows => rows.filter(row => row.id !== id))
    } catch { setError(t("failed")) }
    finally { setBusy(false) }
  }
  return <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{t("queue")}</h2><Button disabled={busy} onClick={() => void refresh()}>{t("refresh")}</Button></div>
    <p className="text-sm text-slate-600">{t("queueHint")}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!busy && reports.length === 0 && <p>{t("noReports")}</p>}
    {reports.map(row => <article key={row.id} className="space-y-3 rounded-xl border bg-white p-4">
      <p className="font-medium">{row.kind} · {row.targetId}</p><p className="text-sm">{t(`reasons.${row.reason}`)}</p>
      <p className="break-words text-sm">{row.evidence?.title}</p><p className="whitespace-pre-wrap break-words text-sm">{row.evidence?.text}</p>
      <p className="whitespace-pre-wrap break-words text-sm">{row.details}</p><p className="text-xs text-slate-500">{row.createdAt}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void resolve(row.id, "dismiss")}>{t("dismiss")}</Button>
        {!["user", "chat"].includes(row.kind) && <Button variant="destructive" disabled={busy} onClick={() => void resolve(row.id, "remove")}>{t("remove")}</Button>}
        <Button variant="destructive" disabled={busy} onClick={() => void resolve(row.id, "suspend")}>{t("suspend")}</Button>
      </div>
    </article>)}
  </section>
}
