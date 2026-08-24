"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Clock, Loader2, Paperclip, Search, Star } from "lucide-react"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge"
import { usePriceFormat } from "@/hooks/use-price-format"
import {
  addClaimAdminNote,
  adminSetClaimStatus,
  claimTime,
  hoursLeftToRespond,
  listAllClaims,
  setClaimPriority,
  subscribeClaim,
  subscribeClaimAdminNotes,
  subscribeClaimEvents,
  subscribeClaimMessages,
  type ClaimAdminNote,
} from "@/lib/claims"
import { CLAIM_STATUSES, isClaimOpen, type ClaimDoc, type ClaimEvent, type ClaimMessage } from "@/types/claims"

type RefundErrorCode =
  | "missing_payment"
  | "mp_not_connected"
  | "mp_token_expired"
  | "mp_payment_lookup_failed"
  | "already_processing"
  | "already_refunded"
  | "forbidden_status"
  | "invalid_amount"
  | "mp_refund_rejected"
  | "generic"

const REFUND_ERROR_CODES: RefundErrorCode[] = [
  "missing_payment",
  "mp_not_connected",
  "mp_token_expired",
  "mp_payment_lookup_failed",
  "already_processing",
  "already_refunded",
  "forbidden_status",
  "invalid_amount",
  "mp_refund_rejected",
  "generic",
]

function isRefundErrorCode(value: string): value is RefundErrorCode {
  return REFUND_ERROR_CODES.includes(value as RefundErrorCode)
}

type RefundPreview = {
  canExecute: boolean
  blockReason: string | null
  mpConnectionError: string | null
  proposalAmount: number | null
  connection: { status: string; connected: boolean; tokenExpired: boolean }
  payment: {
    remaining: number
    refundedAmount: number
    transactionAmount: number
    status: string
    statusDetail: string
  } | null
}

export function AdminClaimsQueue({
  adminId,
  adminName,
}: {
  adminId: string
  adminName: string
}) {
  const t = useTranslations("adminDashboard.claimsAdmin")
  const tClaims = useTranslations("claims")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const { formatPriceNumber } = usePriceFormat()

  const [claims, setClaims] = useState<ClaimDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("open")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<ClaimDoc | null>(null)
  const [messages, setMessages] = useState<ClaimMessage[]>([])
  const [events, setEvents] = useState<ClaimEvent[]>([])
  const [notes, setNotes] = useState<ClaimAdminNote[]>([])
  const [noteBody, setNoteBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundMode, setRefundMode] = useState<"total" | "partial">("total")
  const [refundAmount, setRefundAmount] = useState("")
  const [refundError, setRefundError] = useState<string | null>(null)

  const loadRefundPreview = async (claimId: string, claim?: ClaimDoc | null) => {
    const user = auth.currentUser
    if (!user) return
    setRefundLoading(true)
    setRefundError(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/claims/refund?claimId=${encodeURIComponent(claimId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setRefundPreview(null)
        setRefundError(typeof data.code === "string" ? data.code : "generic")
        return
      }
      setRefundPreview(data as RefundPreview)
      const nextMode =
        claim?.proposalType === "partial_refund" || claim?.status === "partial_refund_requested"
          ? "partial"
          : "total"
      setRefundMode(nextMode)
      const suggested = data.proposalAmount ?? claim?.proposalAmount
      setRefundAmount(nextMode === "partial" && suggested ? String(suggested) : "")
    } catch {
      setRefundPreview(null)
      setRefundError("generic")
    } finally {
      setRefundLoading(false)
    }
  }

  const reload = async () => {
    setLoading(true)
    try {
      setClaims(await listAllClaims())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelected(null)
      setMessages([])
      setEvents([])
      setNotes([])
      setRefundPreview(null)
      setRefundError(null)
      return
    }
    const unsubClaim = subscribeClaim(selectedId, setSelected)
    const unsubMessages = subscribeClaimMessages(selectedId, setMessages)
    const unsubEvents = subscribeClaimEvents(selectedId, setEvents)
    const unsubNotes = subscribeClaimAdminNotes(selectedId, setNotes)
    return () => {
      unsubClaim()
      unsubMessages()
      unsubEvents()
      unsubNotes()
    }
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    const claim = selected?.id === selectedId ? selected : claims.find((item) => item.id === selectedId) || null
    void loadRefundPreview(selectedId, claim)
  }, [selectedId, selected?.status])

  const formatWhen = (value: unknown) => {
    const time = claimTime(value)
    if (!time) return "—"
    return new Date(time).toLocaleString(dateLocale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return claims.filter((claim) => {
      if (statusFilter === "open" && !isClaimOpen(claim.status)) return false
      if (statusFilter === "expiring") {
        const hours = hoursLeftToRespond(claim)
        if (!isClaimOpen(claim.status) || hours == null || hours > 12) return false
      }
      if (statusFilter === "priority" && !claim.priority) return false
      if (statusFilter !== "all" && statusFilter !== "open" && statusFilter !== "expiring" && statusFilter !== "priority") {
        if (claim.status !== statusFilter) return false
      }
      if (!q) return true
      return (
        claim.productName.toLowerCase().includes(q) ||
        claim.buyerName.toLowerCase().includes(q) ||
        claim.sellerName.toLowerCase().includes(q) ||
        claim.paymentId.toLowerCase().includes(q)
      )
    })
  }, [claims, statusFilter, search])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t("filters.open")}</SelectItem>
              <SelectItem value="expiring">{t("filters.expiring")}</SelectItem>
              <SelectItem value="priority">{t("filters.priority")}</SelectItem>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              {CLAIM_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {tClaims(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">{t("empty")}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((claim) => {
              const hours = hoursLeftToRespond(claim)
              const expiring = isClaimOpen(claim.status) && hours != null && hours <= 12
              return (
                <button
                  key={claim.id}
                  type="button"
                  onClick={() => setSelectedId(claim.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === claim.id ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ClaimStatusBadge status={claim.status} />
                    {claim.priority ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Star className="h-3 w-3" />
                        {t("priority")}
                      </span>
                    ) : null}
                    {expiring ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                        <Clock className="h-3 w-3" />
                        {t("expiring")}
                      </span>
                    ) : null}
                    {claim.slaEscalatedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                        {t("escalated")}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate font-medium text-slate-900">{claim.productName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {claim.buyerName} → {claim.sellerName} · {formatWhen(claim.createdAt)}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        {!selected ? (
          <p className="py-16 text-center text-sm text-slate-500">{t("selectHint")}</p>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{selected.productName}</h2>
                <ClaimStatusBadge status={selected.status} />
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">{t("buyer")}</dt>
                  <dd className="font-medium">{selected.buyerName}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t("seller")}</dt>
                  <dd className="font-medium">{selected.sellerName}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t("paymentId")}</dt>
                  <dd className="font-mono">{selected.paymentId || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t("amount")}</dt>
                  <dd className="font-medium">{formatPriceNumber(selected.amount)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t("reason")}</dt>
                  <dd className="font-medium">{tClaims(`reasons.${selected.reason}`)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">{t("purchase")}</dt>
                  <dd className="font-mono text-xs">{selected.purchaseId}</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{selected.description}</p>
              {selected.proposalType ? (
                <p className="mt-2 text-sm text-teal-800">
                  {t("proposal")}: {tClaims(`proposal.types.${selected.proposalType}`)}
                  {selected.proposalAmount != null ? ` · ${formatPriceNumber(selected.proposalAmount)}` : ""}
                  {selected.proposalStatus ? ` · ${tClaims(`proposal.status.${selected.proposalStatus}`)}` : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selected.priority ? "default" : "outline"}
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    setClaimPriority({
                      claim: selected,
                      priority: !selected.priority,
                      actorId: adminId,
                      actorName: adminName,
                    })
                  )
                }
              >
                <Star className="mr-1 h-4 w-4" />
                {selected.priority ? t("unmarkPriority") : t("markPriority")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    adminSetClaimStatus({
                      claim: selected,
                      status: "in_review",
                      actorId: adminId,
                      actorName: adminName,
                    })
                  )
                }
              >
                {t("toReview")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    adminSetClaimStatus({
                      claim: selected,
                      status: "closed",
                      actorId: adminId,
                      actorName: adminName,
                      note: "agreement",
                    })
                  )
                }
              >
                {t("closeAgreement")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    adminSetClaimStatus({
                      claim: selected,
                      status: "rejected",
                      actorId: adminId,
                      actorName: adminName,
                    })
                  )
                }
              >
                {t("reject")}
              </Button>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t("refundBox")}</h3>
                  <p className="mt-1 text-xs text-slate-600">{t("refundHint")}</p>
                </div>
                {refundPreview ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      refundPreview.connection.connected
                        ? "bg-emerald-100 text-emerald-800"
                        : refundPreview.connection.tokenExpired || refundPreview.connection.status === "token_expired"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {t("mpConnection")}:{" "}
                    {refundPreview.connection.connected
                      ? t("mpConnected")
                      : refundPreview.connection.tokenExpired || refundPreview.connection.status === "token_expired"
                        ? t("mpExpired")
                        : t("mpMissing")}
                  </span>
                ) : null}
              </div>

              {refundLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : null}

              {refundPreview?.payment ? (
                <p className="mt-2 text-xs text-slate-600">
                  {t("remaining")}: {formatPriceNumber(refundPreview.payment.remaining)}
                  {refundPreview.payment.refundedAmount > 0
                    ? ` · ${t("alreadyRefundedMp")}: ${formatPriceNumber(refundPreview.payment.refundedAmount)}`
                    : ""}
                </p>
              ) : null}

              {selected.status === "refund_processing" ? (
                <p className="mt-2 text-sm text-orange-800">{t("processingRefund")}</p>
              ) : null}

              {(() => {
                const code = refundError || refundPreview?.blockReason || ""
                const showBlock =
                  Boolean(refundPreview?.mpConnectionError) ||
                  Boolean(refundError) ||
                  (code.startsWith("mp_") || code === "missing_payment" || code === "invalid_amount")
                if (!showBlock) return null
                return (
                  <p className="mt-2 text-sm text-rose-700">
                    {refundPreview?.mpConnectionError ||
                      t(
                        `refundErrors.${
                          isRefundErrorCode(refundError || refundPreview?.blockReason || "generic")
                            ? refundError || refundPreview?.blockReason || "generic"
                            : "generic"
                        }`
                      )}
                  </p>
                )
              })()}

              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
                <div className="space-y-1">
                  <Label>{t("refundMode")}</Label>
                  <Select value={refundMode} onValueChange={(value) => setRefundMode(value as "total" | "partial")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">{t("totalRefund")}</SelectItem>
                      <SelectItem value="partial">{t("partialRefund")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {refundMode === "partial" ? (
                  <div className="space-y-1">
                    <Label>{t("refundAmount")}</Label>
                    <Input
                      inputMode="decimal"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={selected.proposalAmount ? String(selected.proposalAmount) : ""}
                    />
                  </div>
                ) : (
                  <div />
                )}
                <div className="flex items-end">
                  <Button
                    disabled={busy || refundLoading || !refundPreview?.canExecute}
                    onClick={() =>
                      void run(async () => {
                        const user = auth.currentUser
                        if (!user) return
                        setRefundError(null)
                        const token = await user.getIdToken()
                        const res = await fetch("/api/admin/claims/refund", {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            claimId: selected.id,
                            mode: refundMode,
                            amount:
                              refundMode === "partial"
                                ? Number(String(refundAmount).replace(",", "."))
                                : undefined,
                          }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (!res.ok) {
                          setRefundError(typeof data.code === "string" ? data.code : "generic")
                          return
                        }
                        await loadRefundPreview(selected.id, selected)
                      })
                    }
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t("executeRefund")}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("thread")}</h3>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                {messages.map((message) => (
                  <article key={message.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="text-xs text-slate-500">
                      {message.authorName} · {formatWhen(message.createdAt)}
                    </p>
                    {message.body ? <p className="mt-1 whitespace-pre-wrap">{message.body}</p> : null}
                    {message.attachments.map((file) => (
                      <a
                        key={file.path}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-teal-800 underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {file.name}
                      </a>
                    ))}
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("internalNotes")}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                    <p className="text-xs text-amber-900">
                      {note.authorName} · {formatWhen(note.createdAt)}
                    </p>
                    <p className="mt-1">{note.body}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={2}
                  placeholder={t("notePlaceholder")}
                />
                <Button
                  disabled={busy || !noteBody.trim()}
                  onClick={() =>
                    void run(async () => {
                      await addClaimAdminNote({
                        claimId: selected.id,
                        authorId: adminId,
                        authorName: adminName,
                        body: noteBody,
                      })
                      setNoteBody("")
                    })
                  }
                >
                  {t("addNote")}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("history")}</h3>
              <ol className="mt-2 space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-teal-200 pl-3 text-sm">
                    <p className="font-medium">{tClaims(`events.${event.type}`)}</p>
                    <p className="text-xs text-slate-500">
                      {event.actorName} · {formatWhen(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
