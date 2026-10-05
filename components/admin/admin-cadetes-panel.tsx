"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Bike,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Search,
  UserRound,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminPager } from "@/components/admin/admin-pager"
import { usePagedList } from "@/hooks/use-paged-list"
import { getCadeteStatusLabel } from "@/lib/i18n/cadete-labels"
import type { CadeteStatus } from "@/types/cadete"
import { cn } from "@/lib/utils"

export type AdminCadeteUser = {
  id: string
  name: string
  email: string
  phone?: string
  zone?: string
  vehicle?: string
  documentId?: string
  status?: string
  isActive: boolean
  photoURL?: string
  createdAt?: Date
}

type CadeteFilter = "pending" | "approved" | "rejected" | "all"

type AdminCadetesPanelProps = {
  cadetes: AdminCadeteUser[]
  onApprove: (userId: string) => Promise<void>
  onReject: (userId: string) => Promise<void>
}

function resolveStatus(cadete: AdminCadeteUser): CadeteStatus {
  if (cadete.status === "approved" || cadete.status === "rejected" || cadete.status === "pending_approval") {
    return cadete.status
  }
  if (cadete.isActive) return "approved"
  return "pending_approval"
}

function vehicleLabel(
  vehicle: string | undefined,
  tVehicles: (key: string) => string
): string {
  const value = String(vehicle || "").trim()
  if (!value) return "—"
  const known = ["bicycle", "motorcycle", "car", "on_foot"]
  if (known.includes(value)) return tVehicles(value)
  return value
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function AdminCadetesPanel({ cadetes, onApprove, onReject }: AdminCadetesPanelProps) {
  const t = useTranslations("adminDashboard")
  const tVehicles = useTranslations("signupCadete.vehicles")
  const [filter, setFilter] = useState<CadeteFilter>("pending")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [userPickedFilter, setUserPickedFilter] = useState(false)

  const counts = useMemo(() => {
    let pending = 0
    let approved = 0
    let rejected = 0
    for (const cadete of cadetes) {
      const status = resolveStatus(cadete)
      if (status === "pending_approval") pending += 1
      else if (status === "approved") approved += 1
      else rejected += 1
    }
    return { pending, approved, rejected, total: cadetes.length }
  }, [cadetes])

  useEffect(() => {
    if (userPickedFilter) return
    if (counts.pending > 0) setFilter("pending")
    else if (counts.approved > 0) setFilter("approved")
    else if (counts.total > 0) setFilter("all")
  }, [counts.pending, counts.approved, counts.total, userPickedFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("es")
    return cadetes
      .filter((cadete) => {
        const status = resolveStatus(cadete)
        if (filter === "pending" && status !== "pending_approval") return false
        if (filter === "approved" && status !== "approved") return false
        if (filter === "rejected" && status !== "rejected") return false
        if (!q) return true
        const haystack = [
          cadete.name,
          cadete.email,
          cadete.phone,
          cadete.zone,
          cadete.documentId,
          cadete.vehicle,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es")
        return haystack.includes(q)
      })
      .sort((a, b) => {
        const rank = (s: CadeteStatus) =>
          s === "pending_approval" ? 0 : s === "approved" ? 1 : 2
        const diff = rank(resolveStatus(a)) - rank(resolveStatus(b))
        if (diff !== 0) return diff
        return (a.name || "").localeCompare(b.name || "", "es")
      })
  }, [cadetes, filter, search])

  const paged = usePagedList(filtered, 8, `${filter}|${search}`)

  const runAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id)
    try {
      if (action === "approve") await onApprove(id)
      else await onReject(id)
    } finally {
      setBusyId(null)
    }
  }

  const filters: { id: CadeteFilter; label: string; count: number }[] = [
    { id: "pending", label: t("cadetes.filterPending"), count: counts.pending },
    { id: "approved", label: t("cadetes.filterApproved"), count: counts.approved },
    { id: "rejected", label: t("cadetes.filterRejected"), count: counts.rejected },
    { id: "all", label: t("cadetes.filterAll"), count: counts.total },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-sky-950 via-servido-950 to-servido-900 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              <Bike className="h-3.5 w-3.5 text-servido-gold" />
              {t("cadetes.kicker")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("cadetes.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/70">{t("cadetes.description")}</p>
          </div>
          {counts.pending > 0 && (
            <div className="rounded-2xl bg-amber-400/15 px-4 py-3 ring-1 ring-amber-300/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                {t("cadetes.pendingLabel")}
              </p>
              <p className="text-2xl font-semibold text-white">{counts.pending}</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard label={t("cadetes.kpiPending")} value={counts.pending} accent="amber" />
          <KpiCard label={t("cadetes.kpiApproved")} value={counts.approved} accent="emerald" />
          <KpiCard label={t("cadetes.kpiRejected")} value={counts.rejected} accent="rose" />
          <KpiCard label={t("cadetes.kpiTotal")} value={counts.total} accent="sky" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setUserPickedFilter(true)
                setFilter(item.id)
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition",
                filter === item.id
                  ? item.id === "pending"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-servido-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  filter === item.id ? "bg-white/20 text-white" : "bg-white text-slate-600"
                )}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("cadetes.searchPlaceholder")}
            className="h-10 rounded-full border-0 bg-slate-50 pl-9 ring-1 ring-slate-200"
          />
        </div>
      </div>

      {cadetes.length === 0 ? (
        <EmptyState title={t("cadetes.empty")} hint={t("cadetes.emptyHint")} />
      ) : paged.slice.length === 0 ? (
        <EmptyState title={t("cadetes.emptyFiltered")} hint={t("cadetes.emptyFilteredHint")} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-600">
            {filter === "pending" ? t("cadetes.requestsTitle") : t("cadetes.listTitle")}
          </p>

          <div className="grid gap-3">
            {paged.slice.map((cadete) => {
              const status = resolveStatus(cadete)
              const busy = busyId === cadete.id
              const isPending = status === "pending_approval"
              return (
                <article
                  key={cadete.id}
                  className={cn(
                    "rounded-2xl bg-white p-4 shadow-sm transition ring-1 sm:p-5",
                    isPending
                      ? "ring-amber-300/80 shadow-[0_12px_28px_-18px_rgba(217,119,6,0.45)]"
                      : status === "approved"
                        ? "ring-emerald-200/80"
                        : "ring-slate-200/80"
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {cadete.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cadete.photoURL}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-black/5"
                        />
                      ) : (
                        <span
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold",
                            isPending
                              ? "bg-amber-100 text-amber-800"
                              : status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                          )}
                        >
                          {initials(cadete.name || cadete.email || "?")}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-servido-950">
                            {cadete.name || t("cadetes.defaultName")}
                          </h3>
                          <StatusPill status={status} label={getCadeteStatusLabel(t, status)} />
                          {status === "approved" && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                cadete.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              )}
                            >
                              {cadete.isActive
                                ? t("cadetes.activeBadge")
                                : t("cadetes.inactiveBadge")}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-500">{cadete.email}</p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <MetaRow icon={Phone} label={t("cadetes.phone")} value={cadete.phone || "—"} />
                          <MetaRow icon={MapPin} label={t("cadetes.zone")} value={cadete.zone || "—"} />
                          <MetaRow
                            icon={Bike}
                            label={t("cadetes.vehicle")}
                            value={vehicleLabel(cadete.vehicle, tVehicles)}
                          />
                          <MetaRow
                            icon={FileText}
                            label={t("cadetes.document")}
                            value={cadete.documentId || "—"}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:w-44">
                      {status !== "approved" && (
                        <Button
                          className="h-11 rounded-full bg-emerald-600 font-semibold hover:bg-emerald-700"
                          disabled={busy}
                          onClick={() => void runAction(cadete.id, "approve")}
                        >
                          {busy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          {t("common.approve")}
                        </Button>
                      )}
                      {status !== "rejected" && (
                        <Button
                          variant="outline"
                          className="h-11 rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                          disabled={busy}
                          onClick={() => void runAction(cadete.id, "reject")}
                        >
                          {busy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          {status === "approved" ? t("cadetes.deactivate") : t("common.reject")}
                        </Button>
                      )}
                      {status === "approved" && (
                        <p className="text-center text-[11px] text-slate-500 lg:text-left">
                          {t("cadetes.approvedHint")}
                        </p>
                      )}
                      {isPending && (
                        <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-amber-700 lg:justify-start">
                          <Clock3 className="h-3.5 w-3.5" />
                          {t("cadetes.awaitingReview")}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <AdminPager
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            from={paged.from}
            to={paged.to}
            onPageChange={paged.setPage}
          />
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: "amber" | "emerald" | "rose" | "sky"
}) {
  const tones = {
    amber: "bg-amber-400/10 ring-amber-300/25",
    emerald: "bg-emerald-400/10 ring-emerald-300/25",
    rose: "bg-rose-400/10 ring-rose-300/25",
    sky: "bg-sky-400/10 ring-sky-300/25",
  }
  return (
    <div className={cn("rounded-2xl px-3 py-3 ring-1", tones[accent])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/65">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

function StatusPill({ status, label }: { status: CadeteStatus; label: string }) {
  return (
    <Badge
      className={cn(
        "rounded-full border-0",
        status === "pending_approval" && "bg-amber-100 text-amber-900 hover:bg-amber-100",
        status === "approved" && "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
        status === "rejected" && "bg-rose-100 text-rose-900 hover:bg-rose-100"
      )}
    >
      {label}
    </Badge>
  )
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-medium text-slate-700">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/80">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-700">
        <UserRound className="h-7 w-7" />
      </span>
      <p className="mt-4 text-base font-semibold text-servido-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  )
}
