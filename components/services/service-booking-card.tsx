"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import {
  countScheduledDays,
  generateAvailableSlots,
  normalizeServiceSchedule,
  requestServiceAppointment,
  subscribeAppointmentsForService,
  type ServiceSlot,
} from "@/lib/service-appointments"
import type { ServiceSchedule } from "@/types/service-appointments"

type ServiceBookingCardProps = {
  serviceId: string
  serviceName: string
  sellerId: string
  schedule?: ServiceSchedule | null
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"]

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function buildMonthCells(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

type MonthGridProps = {
  month: Date
  selected?: Date
  availableKeys: Set<string>
  minDate: Date
  maxDate: Date
  onSelect: (day: Date) => void
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
}

function BookingMonthGrid({
  month,
  selected,
  availableKeys,
  minDate,
  maxDate,
  onSelect,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: MonthGridProps) {
  const cells = useMemo(() => buildMonthCells(month), [month])

  return (
    <div className="rounded-2xl border border-servido-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-servido-100 text-servido-800 transition hover:bg-servido-50 disabled:opacity-30"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-servido-950">
          {format(month, "MMMM yyyy", { locale: es })}
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-servido-100 text-servido-800 transition hover:bg-servido-50 disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {cells.map((day) => {
          const key = dateKey(day)
          const inMonth = isSameMonth(day, month)
          const dayStart = new Date(day)
          dayStart.setHours(0, 0, 0, 0)
          const available = availableKeys.has(key)
          const outOfRange = dayStart < minDate || dayStart > maxDate
          const disabled = !available || outOfRange || !inMonth
          const isSelected = Boolean(selected && isSameDay(day, selected))
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={key + String(inMonth)}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition",
                !inMonth && "invisible",
                inMonth && disabled && "cursor-not-allowed text-muted-foreground/35",
                inMonth &&
                  available &&
                  !isSelected &&
                  "bg-servido-50 text-servido-900 hover:bg-servido-100",
                isSelected && "bg-servido-800 text-white shadow-md shadow-servido-900/20",
                isToday && !isSelected && "ring-1 ring-servido-300"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Los días en violeta claro tienen turnos disponibles
      </p>
    </div>
  )
}

export function ServiceBookingCard({
  serviceId,
  serviceName,
  sellerId,
  schedule: scheduleProp,
}: ServiceBookingCardProps) {
  const { currentUser } = useAuth()
  const schedule = useMemo(() => normalizeServiceSchedule(scheduleProp), [scheduleProp])
  const [slots, setSlots] = useState<ServiceSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<ServiceSlot | null>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [initializedDay, setInitializedDay] = useState(false)

  const uid = currentUser?.firebaseUser?.uid
  const isOwner = Boolean(uid && uid === sellerId)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const maxDate = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 44)
    return d
  }, [today])

  // En vivo: si alguien reserva, ese horario desaparece para los demás
  useEffect(() => {
    if (!schedule.enabled) {
      setSlots([])
      setLoading(false)
      setLoadError(null)
      return
    }

    setLoading(true)
    setLoadError(null)

    const unsub = subscribeAppointmentsForService(
      serviceId,
      (booked) => {
        const next = generateAvailableSlots({ schedule, booked, daysAhead: 45 })
        setSlots(next)
        setLoading(false)
        setLoadError(null)

        setSelectedSlot((prev) => {
          if (!prev) return null
          const stillFree = next.some((s) => s.start.getTime() === prev.start.getTime())
          return stillFree ? prev : null
        })

        setInitializedDay((done) => {
          if (!done && next.length > 0) {
            setSelectedDay(dateKey(next[0].start))
            setVisibleMonth(startOfMonth(next[0].start))
            return true
          }
          return done
        })
      },
      () => {
        // Nunca mostrar "todo libre" si falla la lectura de ocupados
        setSlots([])
        setLoading(false)
        setLoadError("No pudimos cargar la disponibilidad. Recargá la página.")
      }
    )

    return () => unsub()
  }, [serviceId, schedule])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, ServiceSlot[]>()
    for (const slot of slots) {
      const key = dateKey(slot.start)
      const list = map.get(key) || []
      list.push(slot)
      map.set(key, list)
    }
    return map
  }, [slots])

  const availableDayKeys = useMemo(() => new Set(slotsByDay.keys()), [slotsByDay])
  const selectedDate = selectedDay ? parseDateKey(selectedDay) : undefined
  const daySlots = selectedDay ? slotsByDay.get(selectedDay) || [] : []

  const minMonth = startOfMonth(today)
  const maxMonth = startOfMonth(maxDate)
  const canPrev = visibleMonth > minMonth
  const canNext = visibleMonth < maxMonth

  const handleSelectDay = (day: Date) => {
    const key = dateKey(day)
    if (!availableDayKeys.has(key)) return
    setSelectedDay(key)
    setSelectedSlot(null)
    setError(null)
    setSuccess(null)
  }

  const handleBook = async () => {
    setError(null)
    setSuccess(null)
    if (!uid) {
      setError("Iniciá sesión para pedir un turno.")
      return
    }
    if (isOwner) {
      setError("No podés reservar tu propio servicio.")
      return
    }
    if (!selectedSlot) {
      setError("Elegí un horario.")
      return
    }
    setSubmitting(true)
    try {
      await requestServiceAppointment({
        serviceId,
        sellerId,
        serviceName,
        buyerId: uid,
        buyerName: currentUser?.name || currentUser?.firebaseUser.displayName || null,
        buyerEmail: currentUser?.firebaseUser.email || null,
        start: selectedSlot.start,
        end: selectedSlot.end,
        notes,
      })
      setSuccess("Turno pedido. Te avisamos cuando el prestador confirme.")
      setSelectedSlot(null)
      setNotes("")
      // El listener en vivo actualiza los horarios libres
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir el turno.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!schedule.enabled) {
    return (
      <Card className="overflow-hidden border-servido-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-servido-700" />
            Pedir turno
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          El prestador todavía no publicó horarios. Podés contactarlo por chat.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-servido-100 shadow-md shadow-servido-900/5">
      <CardHeader className="border-b bg-gradient-to-r from-servido-50 to-white pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-servido-950">
          <CalendarDays className="h-5 w-5 text-servido-700" />
          Pedir turno
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Elegí un día y después el horario · turnos de {schedule.durationMinutes} min
        </p>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-servido-700" /> Cargando agenda...
          </div>
        ) : loadError ? (
          <p className="py-6 text-center text-sm text-red-600">{loadError}</p>
        ) : availableDayKeys.size === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {countScheduledDays(schedule) === 0
              ? "Este servicio no tiene días de atención configurados. Pedile al prestador que guarde horarios en su Agenda."
              : "No hay turnos libres en las próximas semanas."}
          </p>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              <BookingMonthGrid
                month={visibleMonth}
                selected={selectedDate}
                availableKeys={availableDayKeys}
                minDate={today}
                maxDate={maxDate}
                onSelect={handleSelectDay}
                onPrev={() => setVisibleMonth((m) => addMonths(m, -1))}
                onNext={() => setVisibleMonth((m) => addMonths(m, 1))}
                canPrev={canPrev}
                canNext={canNext}
              />

              <div className="flex min-h-[300px] flex-col rounded-2xl border border-servido-100 bg-slate-50/80 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-servido-700">
                      Horarios
                    </p>
                    <p className="text-sm font-medium capitalize text-servido-950">
                      {selectedDate
                        ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                        : "Elegí un día"}
                    </p>
                  </div>
                  <Clock className="mt-0.5 h-4 w-4 text-servido-600" />
                </div>

                {daySlots.length === 0 ? (
                  <p className="my-auto text-center text-sm text-muted-foreground">
                    Seleccioná un día marcado en el calendario.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {daySlots.map((slot) => {
                      const active = selectedSlot?.start.getTime() === slot.start.getTime()
                      return (
                        <button
                          key={slot.start.toISOString()}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot)
                            setError(null)
                            setSuccess(null)
                          }}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition",
                            active
                              ? "border-servido-800 bg-servido-800 text-white shadow-md shadow-servido-900/20"
                              : "border-white bg-white text-servido-950 shadow-sm hover:border-servido-300 hover:bg-servido-50"
                          )}
                        >
                          <span className="block">{format(slot.start, "HH:mm")}</span>
                          <span
                            className={cn(
                              "mt-0.5 block text-[10px] font-normal",
                              active ? "text-white/80" : "text-muted-foreground"
                            )}
                          >
                            hasta {format(slot.end, "HH:mm")}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {selectedSlot && (
                  <div className="mt-auto rounded-xl border border-servido-200 bg-white px-3 py-2.5 text-sm">
                    <p className="text-xs text-muted-foreground">Turno seleccionado</p>
                    <p className="font-semibold capitalize text-servido-950">
                      {format(selectedSlot.start, "EEE d MMM · HH:mm", { locale: es })} –{" "}
                      {format(selectedSlot.end, "HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="booking-notes">Nota (opcional)</Label>
              <Textarea
                id="booking-notes"
                className="mt-1.5 rounded-xl"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalle breve del trabajo o consulta"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}

        {!uid ? (
          <Button asChild className="h-11 w-full rounded-xl bg-servido-800 hover:bg-servido-900">
            <Link href="/login">Iniciar sesión para reservar</Link>
          </Button>
        ) : (
          <Button
            className="h-11 w-full rounded-xl bg-servido-800 hover:bg-servido-900"
            disabled={submitting || !selectedSlot || isOwner || availableDayKeys.size === 0}
            onClick={() => void handleBook()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              "Confirmar turno"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
