"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, Clock, Handshake, Loader2, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { usePriceFormat } from "@/hooks/use-price-format"
import {
  addClaimMessage,
  claimTime,
  closeClaim,
  hoursLeftToRespond,
  proposeClaimSolution,
  respondToClaimProposal,
  subscribeClaim,
  subscribeClaimEvents,
  subscribeClaimMessages,
} from "@/lib/claims"
import { validateClaimFiles } from "@/lib/claim-storage"
import {
  CLAIM_PROPOSAL_TYPES,
  isClaimOpen,
  type ClaimDoc,
  type ClaimEvent,
  type ClaimMessage,
  type ClaimProposalType,
} from "@/types/claims"
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge"

export function ClaimDetail({
  claimId,
  currentUserId,
  currentUserName,
  role,
}: {
  claimId: string
  currentUserId: string
  currentUserName: string
  role: "buyer" | "seller"
}) {
  const t = useTranslations("claims")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const { formatPriceNumber } = usePriceFormat()
  const [claim, setClaim] = useState<ClaimDoc | null>(null)
  const [messages, setMessages] = useState<ClaimMessage[]>([])
  const [events, setEvents] = useState<ClaimEvent[]>([])
  const [body, setBody] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposalType, setProposalType] = useState<ClaimProposalType | "">("")
  const [proposalNote, setProposalNote] = useState("")
  const [proposalAmount, setProposalAmount] = useState("")
  const [proposalTracking, setProposalTracking] = useState("")
  const [proposalFiles, setProposalFiles] = useState<File[]>([])
  const [proposing, setProposing] = useState(false)
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    const unsubClaim = subscribeClaim(claimId, setClaim)
    const unsubMessages = subscribeClaimMessages(claimId, setMessages)
    const unsubEvents = subscribeClaimEvents(claimId, setEvents)
    return () => {
      unsubClaim()
      unsubMessages()
      unsubEvents()
    }
  }, [claimId])

  const backHref = role === "seller" ? "/dashboard/seller?tab=claims" : "/dashboard/buyer?tab=claims"
  const hours = claim ? hoursLeftToRespond(claim) : null
  const canWrite = Boolean(claim && isClaimOpen(claim.status))

  const formatWhen = (value: unknown) => {
    const time = claimTime(value)
    if (!time) return ""
    return new Date(time).toLocaleString(dateLocale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const remainingLabel = useMemo(() => {
    if (hours == null || !claim || !isClaimOpen(claim.status) || claim.status !== "waiting_seller") return null
    if (hours <= 0) return t("deadlineExpired")
    const whole = Math.ceil(hours)
    return t("deadlineHours", { hours: whole })
  }, [hours, claim, t])

  const handleSend = async () => {
    if (!claim) return
    const code = validateClaimFiles(files)
    if (code) {
      setError(t(`errors.${code}`))
      return
    }
    setSending(true)
    setError(null)
    try {
      await addClaimMessage({
        claim,
        authorId: currentUserId,
        authorRole: role,
        authorName: currentUserName,
        body,
        files,
      })
      setBody("")
      setFiles([])
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (message.startsWith("claim:")) setError(t(`errors.${message.replace("claim:", "")}`))
      else setError(t("errors.generic"))
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    if (!claim) return
    if (!window.confirm(t("confirmClose"))) return
    setClosing(true)
    try {
      await closeClaim({
        claim,
        actorId: currentUserId,
        actorRole: role,
        actorName: currentUserName,
      })
    } catch {
      setError(t("errors.generic"))
    } finally {
      setClosing(false)
    }
  }

  const handlePropose = async () => {
    if (!claim || !proposalType) {
      setError(t("errors.empty_proposal_type"))
      return
    }
    const code = validateClaimFiles(proposalFiles)
    if (code) {
      setError(t(`errors.${code}`))
      return
    }
    setProposing(true)
    setError(null)
    try {
      await proposeClaimSolution({
        claim,
        sellerId: currentUserId,
        sellerName: currentUserName,
        type: proposalType,
        note: proposalNote,
        amount: proposalAmount ? Number(proposalAmount.replace(",", ".")) : undefined,
        trackingNumber: proposalTracking,
        files: proposalFiles,
      })
      setProposalNote("")
      setProposalAmount("")
      setProposalTracking("")
      setProposalFiles([])
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (message.startsWith("claim:")) setError(t(`errors.${message.replace("claim:", "")}`))
      else setError(t("errors.generic"))
    } finally {
      setProposing(false)
    }
  }

  const handleProposalResponse = async (accept: boolean) => {
    if (!claim) return
    setResponding(true)
    setError(null)
    try {
      await respondToClaimProposal({
        claim,
        buyerId: currentUserId,
        buyerName: currentUserName,
        accept,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (message.startsWith("claim:")) setError(t(`errors.${message.replace("claim:", "")}`))
      else setError(t("errors.generic"))
    } finally {
      setResponding(false)
    }
  }

  if (!claim) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  const counterpart = role === "buyer" ? claim.sellerName : claim.buyerName

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Button asChild variant="ghost" className="rounded-full px-0 text-slate-600">
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("actions.back")}
        </Link>
      </Button>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">{t("eyebrow")}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{claim.productName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {role === "buyer" ? t("withSeller", { name: counterpart }) : t("withBuyer", { name: counterpart })}
            </p>
          </div>
          <ClaimStatusBadge status={claim.status} />
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">{t("fields.reason")}</dt>
            <dd className="font-medium text-slate-800">{t(`reasons.${claim.reason}`)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("fields.amount")}</dt>
            <dd className="font-medium text-slate-800">{formatPriceNumber(claim.amount)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("fields.paymentId")}</dt>
            <dd className="font-mono text-slate-800">{claim.paymentId || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("fields.receivedPartial")}</dt>
            <dd className="font-medium text-slate-800">{claim.receivedPartial ? t("yes") : t("no")}</dd>
          </div>
        </dl>
        {claim.proposedSolution ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-medium">{t("fields.proposedSolution")}: </span>
            {claim.proposedSolution}
          </p>
        ) : null}
        {remainingLabel ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">
            <Clock className="h-4 w-4" />
            {remainingLabel}
          </p>
        ) : null}
      </section>

      {claim.proposalType && claim.proposalStatus ? (
        <section className="rounded-3xl border border-teal-200/80 bg-teal-50/60 p-5 shadow-sm">
          <div className="flex items-start gap-2">
            <Handshake className="mt-0.5 h-5 w-5 text-teal-700" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">{t("proposal.title")}</h2>
              <p className="mt-1 text-sm font-medium text-teal-900">{t(`proposal.types.${claim.proposalType}`)}</p>
              {claim.proposalNote ? <p className="mt-2 text-sm text-slate-700">{claim.proposalNote}</p> : null}
              {claim.proposalAmount != null ? (
                <p className="mt-2 text-sm text-slate-700">
                  {t("proposal.amount")}: {formatPriceNumber(claim.proposalAmount)}
                </p>
              ) : null}
              {claim.proposalTracking ? (
                <p className="mt-1 text-sm text-slate-700">
                  {t("proposal.tracking")}: <span className="font-mono">{claim.proposalTracking}</span>
                </p>
              ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
                {t(`proposal.status.${claim.proposalStatus}`)}
              </p>
              {role === "buyer" && claim.proposalStatus === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => void handleProposalResponse(true)} disabled={responding}>
                    {responding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t("proposal.accept")}
                  </Button>
                  <Button variant="outline" onClick={() => void handleProposalResponse(false)} disabled={responding}>
                    {t("proposal.reject")}
                  </Button>
                </div>
              ) : null}
              {claim.proposalStatus === "accepted" &&
              (claim.proposalType === "partial_refund" || claim.proposalType === "total_refund") &&
              claim.status !== "refund_approved" &&
              claim.status !== "refund_processing" ? (
                <p className="mt-3 text-sm text-slate-600">{t("proposal.refundPendingAdmin")}</p>
              ) : null}
              {claim.status === "refund_approved" ? (
                <p className="mt-3 text-sm text-emerald-800">
                  {t("proposal.refundConfirmed")}
                  {claim.refundAmount != null ? ` ${formatPriceNumber(claim.refundAmount)}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {role === "seller" && canWrite && claim.proposalStatus !== "pending" && claim.proposalStatus !== "accepted" ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{t("proposal.formTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("proposal.formHint")}</p>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label>{t("proposal.type")}</Label>
              <Select value={proposalType} onValueChange={(value) => setProposalType(value as ClaimProposalType)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("proposal.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_PROPOSAL_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`proposal.types.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {proposalType === "partial_refund" ? (
              <div className="space-y-2">
                <Label htmlFor="proposal-amount">{t("proposal.amount")}</Label>
                <Input
                  id="proposal-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={proposalAmount}
                  onChange={(e) => setProposalAmount(e.target.value)}
                />
              </div>
            ) : null}
            {proposalType === "reship" ? (
              <div className="space-y-2">
                <Label htmlFor="proposal-tracking">{t("proposal.tracking")}</Label>
                <Input
                  id="proposal-tracking"
                  value={proposalTracking}
                  onChange={(e) => setProposalTracking(e.target.value)}
                  placeholder={t("proposal.trackingPlaceholder")}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="proposal-note">{t("proposal.note")}</Label>
              <Textarea
                id="proposal-note"
                value={proposalNote}
                onChange={(e) => setProposalNote(e.target.value)}
                rows={3}
                placeholder={t("proposal.notePlaceholder")}
              />
            </div>
            <Input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => setProposalFiles(Array.from(e.target.files || []))}
            />
            <Button onClick={() => void handlePropose()} disabled={proposing}>
              {proposing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("proposal.submit")}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t("thread.title")}</h2>
        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-2xl p-4 ${
                message.authorRole === role ? "bg-teal-50" : "bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">
                  {message.authorName} · {t(`roles.${message.authorRole}`)}
                </span>
                <span>{formatWhen(message.createdAt)}</span>
              </div>
              {message.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{message.body}</p> : null}
              {message.attachments.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {message.attachments.map((file) => (
                    <li key={file.path}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-teal-800 underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        {canWrite ? (
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={t("thread.replyPlaceholder")}
            />
            <Input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSend()} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("actions.reply")}
              </Button>
              <Button variant="outline" onClick={() => void handleClose()} disabled={closing}>
                {t("actions.close")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">{t("thread.closed")}</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t("history.title")}</h2>
        <ol className="mt-4 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-teal-200 pl-3 text-sm">
              <p className="font-medium text-slate-800">{t(`events.${event.type}`)}</p>
              <p className="text-xs text-slate-500">
                {event.actorName} · {formatWhen(event.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
