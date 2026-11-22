"use client"
import { useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Flag, ShieldBan } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSafety, safetyRequest } from "@/contexts/safety-context"
import { REPORT_REASONS, type ReportKind, type ReportReason } from "@/lib/safety-policy"
import { SERVIDO_OFFICIAL_USER_ID } from "@/lib/servido-official"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function ContentSafety({ kind, targetId, authorId, onOpenChange }: { kind: ReportKind; targetId: string; authorId?: string; onOpenChange?: (open: boolean) => void }) {
  const t = useTranslations("safety")
  const { currentUser } = useAuth()
  const { isBlocked } = useSafety()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>("other")
  const [details, setDetails] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  if (!currentUser || currentUser.firebaseUser.uid === authorId || authorId === SERVIDO_OFFICIAL_USER_ID) return null
  async function act(action: "report" | "block") {
    setBusy(true); setMessage("")
    try {
      if (action === "report") await safetyRequest("/api/safety/reports", { kind, targetId, reason, details })
      else await safetyRequest("/api/safety/blocks", { targetUid: authorId }, isBlocked(authorId) ? "DELETE" : "POST")
      setMessage(t(action === "report" ? "reported" : "blockChanged"))
    } catch { setMessage(t("failed")) }
    finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setMessage(""); onOpenChange?.(value) } }}>
    <DialogTrigger asChild><button type="button" className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-xs text-slate-700" onClick={e => e.stopPropagation()}><Flag size={14} />{t("actions")}</button></DialogTrigger>
    <DialogContent overlayClassName="z-[90]" className="z-[100] max-h-[85dvh] overflow-y-auto" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
      <DialogHeader><DialogTitle>{t("actions")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>
      <label className="text-sm" htmlFor={`reason-${targetId}`}>{t("reason")}</label>
      <select id={`reason-${targetId}`} className="rounded-lg border p-2 text-slate-900" value={reason} onChange={e => setReason(e.target.value as ReportReason)} disabled={busy}>
        {REPORT_REASONS.map(value => <option key={value} value={value}>{t(`reasons.${value}`)}</option>)}
      </select>
      <label className="text-sm" htmlFor={`details-${targetId}`}>{t("details")}</label>
      <textarea id={`details-${targetId}`} maxLength={1000} className="min-h-24 rounded-lg border p-2 text-slate-900" value={details} onChange={e => setDetails(e.target.value)} disabled={busy} />
      <Button disabled={busy} onClick={() => void act("report")}><Flag className="mr-2 h-4 w-4" />{t("report")}</Button>
      {authorId && <Button variant="outline" disabled={busy} onClick={() => void act("block")}><ShieldBan className="mr-2 h-4 w-4" />{t(isBlocked(authorId) ? "unblock" : "block")}</Button>}
      <a className="text-sm underline" href="mailto:servido.interno@gmail.com">{t("contact")}</a>
      {message && <p role="status" className="text-sm">{message}</p>}
    </DialogContent>
  </Dialog>
}
export function SafetyGate({ authorId, children }: { authorId?: string; children: ReactNode }) {
  const { isBlocked } = useSafety()
  const t = useTranslations("safety")
  if (!isBlocked(authorId)) return <>{children}</>
  return <div className="rounded-xl border bg-white p-4 text-slate-700"><p className="mb-2 text-sm">{t("hidden")}</p><ContentSafety kind="user" targetId={authorId!} authorId={authorId} /></div>
}
