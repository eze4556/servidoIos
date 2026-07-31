"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CalendarDays, Check, CheckCircle2, Loader2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BuyerPanel } from "@/components/dashboard/buyer/buyer-panel"
import { useToast } from "@/components/ui/use-toast"
import {
  appointmentStartDate,
  countScheduledDays,
  formatAppointmentWhen,
  normalizeServiceSchedule,
  saveServiceSchedule,
  subscribeSellerAppointments,
  syncAppointmentNotificationsForUser,
  updateAppointmentStatus,
} from "@/lib/service-appointments"
import type { ServiceAppointment, ServiceSchedule, WeekdayKey } from "@/types/service-appointments"
import { DEFAULT_SERVICE_SCHEDULE, WEEKDAY_ORDER } from "@/types/service-appointments"
import { useLocale, useTranslations } from "next-intl"
import { translateClientError } from "@/lib/i18n/translate-client-error"
import { getAppointmentStatusLabel, getWeekdayLabel } from "@/lib/i18n/agenda-labels"

type ServiceOption = {
  id: string
  name: string
  serviceSchedule?: ServiceSchedule | null
}

type SellerAgendaPanelProps = {
  sellerId: string
  services: ServiceOption[]
  onScheduleSaved?: (serviceId: string, schedule: ServiceSchedule) => void
}

function statusVariant(status: ServiceAppointment["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "confirmed") return "default"
  if (status === "pending") return "secondary"
  if (status === "rejected" || status === "cancelled") return "destructive"
  return "outline"
}

function editorScheduleForService(svc?: ServiceOption | null): ServiceSchedule {
  if (svc?.serviceSchedule) {
    const normalized = normalizeServiceSchedule(svc.serviceSchedule)
    if (countScheduledDays(normalized) === 0) {
      return {
        ...normalized,
        enabled: true,
        weekly: { ...DEFAULT_SERVICE_SCHEDULE.weekly },
      }
    }
    return normalized
  }
  return {
    ...DEFAULT_SERVICE_SCHEDULE,
    enabled: true,
    weekly: { ...DEFAULT_SERVICE_SCHEDULE.weekly },
  }
}

export function SellerAgendaPanel({ sellerId, services, onScheduleSaved }: SellerAgendaPanelProps) {
  const { toast } = useToast()
  const t = useTranslations("sellerDashboard.agenda")
  const tAlerts = useTranslations("sellerDashboard.alerts")
  const tApi = useTranslations("apiErrors")
  const describeApiError = (err: unknown, fallback: string) =>
    err instanceof Error ? translateClientError(err.message, tApi) : fallback
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([])
  const [loadingAppts, setLoadingAppts] = useState(true)
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || "")
  const [schedule, setSchedule] = useState<ServiceSchedule>(() => editorScheduleForService(services[0]))
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!services.length) {
      setSelectedServiceId("")
      return
    }
    if (!selectedServiceId || !services.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(services[0].id)
    }
  }, [services, selectedServiceId])

  useEffect(() => {
    if (!selectedServiceId) return
    const svc = services.find((s) => s.id === selectedServiceId)
    setSchedule(editorScheduleForService(svc))
    setMessage(null)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- services intencional omitido
  }, [selectedServiceId])

  useEffect(() => {
    if (!sellerId) return
    setLoadingAppts(true)
    void syncAppointmentNotificationsForUser(sellerId)
    return subscribeSellerAppointments(sellerId, (items) => {
      setAppointments(items)
      setLoadingAppts(false)
    })
  }, [sellerId])

  const upcoming = useMemo(() => {
    const now = Date.now() - 2 * 60 * 60 * 1000
    return appointments
      .filter((a) => {
        const start = appointmentStartDate(a)
        return start ? start.getTime() >= now : true
      })
      .sort((a, b) => {
        const as = appointmentStartDate(a)?.getTime() || 0
        const bs = appointmentStartDate(b)?.getTime() || 0
        return as - bs
      })
  }, [appointments])

  const selectedServiceName = services.find((s) => s.id === selectedServiceId)?.name || t("serviceDefaultName")

  const toggleDay = (key: WeekdayKey, enabled: boolean) => {
    setSchedule((prev) => {
      const weekly = { ...prev.weekly }
      if (enabled) {
        weekly[key] = weekly[key]?.length ? weekly[key] : [{ start: "09:00", end: "18:00" }]
      } else {
        delete weekly[key]
      }
      return { ...prev, weekly }
    })
  }

  const updateRange = (key: WeekdayKey, field: "start" | "end", value: string) => {
    setSchedule((prev) => {
      const current = prev.weekly[key]?.[0] || { start: "09:00", end: "18:00" }
      return {
        ...prev,
        weekly: {
          ...prev.weekly,
          [key]: [{ ...current, [field]: value }],
        },
      }
    })
  }

  const handleSaveSchedule = async () => {
    if (!selectedServiceId) return
    setSaving(true)
    setError(null)
    setMessage(null)

    let toSave = normalizeServiceSchedule(schedule)
    const days = countScheduledDays(toSave)

    if (days === 0) {
      const msg = t("needDaysError")
      setError(msg)
      toast({ title: t("needDaysToastTitle"), description: msg, variant: "destructive" })
      setSaving(false)
      return
    }

    if (!toSave.enabled) {
      toSave = { ...toSave, enabled: true }
      setSchedule(toSave)
    }

    try {
      const saved = await saveServiceSchedule(selectedServiceId, toSave)
      setSchedule(saved)
      onScheduleSaved?.(selectedServiceId, saved)
      const dayCount = countScheduledDays(saved)
      const ok =
        dayCount === 1
          ? t("scheduleSavedDescription", { serviceName: selectedServiceName, count: dayCount })
          : t("scheduleSavedDescriptionPlural", { serviceName: selectedServiceName, count: dayCount })
      setMessage(ok)
      toast({
        title: t("scheduleSavedTitle"),
        description: ok,
      })
    } catch (err) {
      const msg = describeApiError(err, t("saveGenericError"))
      setError(msg)
      toast({
        title: t("saveErrorToastTitle"),
        description: msg,
        variant: "destructive",
      })
      console.error("saveServiceSchedule failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (appointmentId: string, status: ServiceAppointment["status"]) => {
    setBusyId(appointmentId)
    setError(null)
    try {
      await updateAppointmentStatus({ appointmentId, status, actorId: sellerId })
      toast({
        title: t("appointmentUpdatedTitle"),
        description: getAppointmentStatusLabel(t, status),
      })
    } catch (err) {
      const msg = describeApiError(err, t("updateError"))
      setError(msg)
      toast({ title: tAlerts("errorTitle"), description: msg, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  if (services.length === 0) {
    return (
      <BuyerPanel title={t("emptyPanelTitle")} description={t("emptyPanelDescription")}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("emptyNoServicesTitle")}</AlertTitle>
          <AlertDescription>{t("emptyNoServicesDescription")}</AlertDescription>
        </Alert>
      </BuyerPanel>
    )
  }

  return (
    <div className="space-y-6">
      <Alert className="border-servido-200 bg-servido-50/80 text-servido-950">
        <CalendarDays className="h-4 w-4" />
        <AlertTitle>{t("bannerTitle")}</AlertTitle>
        <AlertDescription>{t("bannerDescription")}</AlertDescription>
      </Alert>

      <BuyerPanel title={t("availabilityTitle")} description={t("availabilityDescription")}>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">{t("serviceLabel")}</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.serviceSchedule?.enabled ? t("serviceWithSchedule") : t("serviceWithoutSchedule")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{t("acceptOnlineTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("acceptOnlineHint")}</p>
            </div>
            <Switch
              checked={schedule.enabled}
              onCheckedChange={(v) => setSchedule((prev) => ({ ...prev, enabled: v }))}
            />
          </div>

          <div className="max-w-[180px]">
            <Label htmlFor="duration">{t("durationLabel")}</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={480}
              step={15}
              className="mt-1"
              value={schedule.durationMinutes}
              onChange={(e) =>
                setSchedule((prev) => ({
                  ...prev,
                  durationMinutes: Number(e.target.value) || 60,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            {WEEKDAY_ORDER.map((key) => {
              const dayOn = Boolean(schedule.weekly[key]?.length)
              const range = schedule.weekly[key]?.[0] || { start: "09:00", end: "18:00" }
              return (
                <div
                  key={key}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border px-3 py-2 sm:grid-cols-[140px_1fr_auto]"
                >
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={dayOn}
                      onChange={(e) => toggleDay(key, e.target.checked)}
                    />
                    {getWeekdayLabel(t, key)}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      disabled={!dayOn}
                      value={range.start}
                      onChange={(e) => updateRange(key, "start", e.target.value)}
                      className="w-[130px]"
                    />
                    <span className="text-xs text-muted-foreground">{t("timeRangeTo")}</span>
                    <Input
                      type="time"
                      disabled={!dayOn}
                      value={range.end}
                      onChange={(e) => updateRange(key, "end", e.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("saveErrorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <AlertTitle>{t("saveSuccessTitle")}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button disabled={saving || !selectedServiceId} onClick={() => void handleSaveSchedule()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> {t("saveSchedule")}
              </>
            )}
          </Button>
        </div>
      </BuyerPanel>

      <BuyerPanel title={t("upcomingTitle")} description={t("upcomingDescription")}>
        {loadingAppts ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingAppointments")}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
            {t("noAppointments")}
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <div key={appt.id} className="rounded-xl border p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{appt.serviceName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAppointmentWhen(appt, { locale: dateLocale, noDate: t("noDate") })}
                    </p>
                    <p className="mt-1 text-sm">
                      {appt.buyerName || t("buyerDefault")}
                      {appt.buyerEmail ? ` · ${appt.buyerEmail}` : ""}
                    </p>
                    {appt.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("notePrefix", { notes: appt.notes })}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusVariant(appt.status)}>
                    {getAppointmentStatusLabel(t, appt.status)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {appt.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busyId === appt.id}
                        onClick={() => void handleStatus(appt.id, "confirmed")}
                      >
                        <Check className="mr-1 h-4 w-4" /> {t("confirm")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === appt.id}
                        onClick={() => void handleStatus(appt.id, "rejected")}
                      >
                        <X className="mr-1 h-4 w-4" /> {t("reject")}
                      </Button>
                    </>
                  )}
                  {appt.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busyId === appt.id}
                        onClick={() => void handleStatus(appt.id, "completed")}
                      >
                        {t("complete")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === appt.id}
                        onClick={() => void handleStatus(appt.id, "cancelled")}
                      >
                        {t("cancel")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </BuyerPanel>
    </div>
  )
}
