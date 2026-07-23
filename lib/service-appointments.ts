import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { createAppNotification, dispatchAppNotifications } from "@/lib/notifications"
import type {
  ServiceAppointment,
  ServiceAppointmentStatus,
  ServiceSchedule,
  ServiceTimeRange,
  WeekdayKey,
} from "@/types/service-appointments"
import { DEFAULT_SERVICE_SCHEDULE } from "@/types/service-appointments"

const COLLECTION = "serviceAppointments"
const SLOT_LOCKS = "serviceSlotLocks"

/** Estados que ocupan el horario (no se ofrece a otros). */
export const BLOCKING_APPOINTMENT_STATUSES = new Set(["pending", "confirmed"])

export type ServiceSlot = {
  start: Date
  end: Date
  label: string
}

/** Id estable del candado de un horario (evita doble reserva). */
export function slotLockId(serviceId: string, start: Date): string {
  return `${serviceId}_${start.getTime()}`
}

export function isBlockingAppointmentStatus(status: string): boolean {
  return BLOCKING_APPOINTMENT_STATUSES.has(status)
}

/** Acepta "9:00", "09:00" o "09:00:00" (input type=time en algunos browsers). */
function parseHm(hm: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(hm || "").trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return { h, m: min }
}

function normalizeHm(hm: string): string | null {
  const parsed = parseHm(hm)
  if (!parsed) return null
  return `${String(parsed.h).padStart(2, "0")}:${String(parsed.m).padStart(2, "0")}`
}

function formatHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function atLocalTime(day: Date, hm: string): Date | null {
  const parsed = parseHm(hm)
  if (!parsed) return null
  const d = new Date(day)
  d.setHours(parsed.h, parsed.m, 0, 0)
  return d
}

function sanitizeWeekly(
  weekly: ServiceSchedule["weekly"] | undefined
): ServiceSchedule["weekly"] {
  const out: ServiceSchedule["weekly"] = {}
  if (!weekly || typeof weekly !== "object") return out
  for (const key of Object.keys(weekly) as WeekdayKey[]) {
    const ranges = weekly[key]
    if (!Array.isArray(ranges) || ranges.length === 0) continue
    const cleaned = ranges
      .map((r) => {
        const start = normalizeHm(String(r?.start || ""))
        const end = normalizeHm(String(r?.end || ""))
        if (!start || !end) return null
        // Descartar franjas inválidas (fin <= inicio)
        if (start >= end) return null
        return { start, end }
      })
      .filter(Boolean) as ServiceTimeRange[]
    if (cleaned.length > 0) out[key] = cleaned
  }
  return out
}

export function normalizeServiceSchedule(raw: unknown): ServiceSchedule {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SERVICE_SCHEDULE,
      weekly: { ...DEFAULT_SERVICE_SCHEDULE.weekly },
    }
  }
  const s = raw as Partial<ServiceSchedule>
  const duration = Number(s.durationMinutes)
  return {
    enabled: Boolean(s.enabled),
    durationMinutes: Number.isFinite(duration) && duration >= 15 ? Math.min(duration, 480) : 60,
    weekly: sanitizeWeekly(s.weekly as ServiceSchedule["weekly"]),
  }
}

/** Cantidad de días con al menos una franja. */
export function countScheduledDays(schedule: ServiceSchedule): number {
  return Object.values(schedule.weekly || {}).filter((ranges) => Array.isArray(ranges) && ranges.length > 0)
    .length
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof (value as Timestamp)?.toDate === "function") return (value as Timestamp).toDate()
  const d = new Date(value as string | number)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Genera turnos libres para los próximos `daysAhead` días. */
export function generateAvailableSlots(params: {
  schedule: ServiceSchedule
  booked: Array<{ startAt: unknown; endAt: unknown; status: string }>
  daysAhead?: number
  from?: Date
}): ServiceSlot[] {
  const schedule = normalizeServiceSchedule(params.schedule)
  if (!schedule.enabled) return []

  const duration = schedule.durationMinutes
  const daysAhead = params.daysAhead ?? 14
  const from = params.from ?? new Date()
  const busy = params.booked
    .filter((b) => isBlockingAppointmentStatus(b.status))
    .map((b) => {
      const start = toDate(b.startAt)
      const end = toDate(b.endAt)
      return start && end ? { start, end } : null
    })
    .filter(Boolean) as Array<{ start: Date; end: Date }>

  const slots: ServiceSlot[] = []
  const startDay = new Date(from)
  startDay.setHours(0, 0, 0, 0)

  for (let i = 0; i < daysAhead; i++) {
    const day = new Date(startDay)
    day.setDate(startDay.getDate() + i)
    const key = String(day.getDay()) as WeekdayKey
    const ranges = (schedule.weekly[key] || []) as ServiceTimeRange[]

    for (const range of ranges) {
      let cursor = atLocalTime(day, range.start)
      const rangeEnd = atLocalTime(day, range.end)
      if (!cursor || !rangeEnd) continue

      while (cursor.getTime() + duration * 60_000 <= rangeEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + duration * 60_000)
        const isPast = slotEnd.getTime() <= from.getTime()
        const conflict = busy.some((b) => rangesOverlap(cursor!, slotEnd, b.start, b.end))
        if (!isPast && !conflict) {
          slots.push({
            start: new Date(cursor),
            end: slotEnd,
            label: `${formatHm(cursor)} – ${formatHm(slotEnd)}`,
          })
        }
        cursor = new Date(cursor.getTime() + duration * 60_000)
      }
    }
  }

  return slots
}

export async function fetchAppointmentsForService(
  serviceId: string,
  opts?: { from?: Date; limitCount?: number }
): Promise<ServiceAppointment[]> {
  const from = opts?.from
  try {
    const q = query(
      collection(db, COLLECTION),
      where("serviceId", "==", serviceId),
      limit(opts?.limitCount ?? 150)
    )
    const snap = await getDocs(q)
    return sortAppointments(
      mapAppointmentDocs(snap.docs).filter((a) => {
        if (!from) return true
        const end = toDate(a.endAt)
        return !end || end >= from
      }),
      "asc"
    )
  } catch (err) {
    console.warn("fetchAppointmentsForService:", err)
    throw err
  }
}

/** Escucha reservas del servicio para ocultar horarios ocupados en vivo. */
export function subscribeAppointmentsForService(
  serviceId: string,
  onChange: (items: ServiceAppointment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("serviceId", "==", serviceId), limit(150))
  return onSnapshot(
    q,
    (snap) => {
      onChange(sortAppointments(mapAppointmentDocs(snap.docs), "asc"))
    },
    (err) => {
      console.warn("subscribeAppointmentsForService:", err)
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  )
}

function mapAppointmentDocs(docs: { id: string; data: () => Record<string, unknown> }[]): ServiceAppointment[] {
  return docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceAppointment, "id">) }))
}

function sortAppointments(items: ServiceAppointment[], dir: "asc" | "desc" = "asc"): ServiceAppointment[] {
  const sign = dir === "asc" ? 1 : -1
  return [...items].sort((a, b) => {
    const as = toDate(a.startAt)?.getTime() || 0
    const bs = toDate(b.startAt)?.getTime() || 0
    return (as - bs) * sign
  })
}

export async function fetchSellerAppointments(sellerId: string): Promise<ServiceAppointment[]> {
  try {
    const q = query(collection(db, COLLECTION), where("sellerId", "==", sellerId), limit(150))
    const snap = await getDocs(q)
    return sortAppointments(mapAppointmentDocs(snap.docs), "asc")
  } catch (err) {
    console.warn("fetchSellerAppointments:", err)
    return []
  }
}

export async function fetchBuyerAppointments(buyerId: string): Promise<ServiceAppointment[]> {
  try {
    // Solo where (sin orderBy): no depende de índice compuesto
    const q = query(collection(db, COLLECTION), where("buyerId", "==", buyerId), limit(80))
    const snap = await getDocs(q)
    return sortAppointments(mapAppointmentDocs(snap.docs), "desc")
  } catch (err) {
    console.warn("fetchBuyerAppointments:", err)
    return []
  }
}

export function subscribeBuyerAppointments(
  buyerId: string,
  onChange: (items: ServiceAppointment[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("buyerId", "==", buyerId), limit(80))
  return onSnapshot(
    q,
    (snap) => {
      onChange(sortAppointments(mapAppointmentDocs(snap.docs), "desc"))
    },
    (err) => {
      console.warn("subscribeBuyerAppointments:", err)
      onChange([])
    }
  )
}

export function subscribeSellerAppointments(
  sellerId: string,
  onChange: (items: ServiceAppointment[]) => void
): Unsubscribe {
  // Sin orderBy en el listener: ordenamos en cliente (más estable)
  const q = query(collection(db, COLLECTION), where("sellerId", "==", sellerId), limit(150))
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceAppointment, "id">) }))
      items.sort((a, b) => {
        const as = toDate(a.startAt)?.getTime() || 0
        const bs = toDate(b.startAt)?.getTime() || 0
        return as - bs
      })
      onChange(items)
    },
    (err) => {
      console.warn("subscribeSellerAppointments:", err)
      onChange([])
    }
  )
}

export async function saveServiceSchedule(serviceId: string, schedule: ServiceSchedule): Promise<ServiceSchedule> {
  const normalized = normalizeServiceSchedule(schedule)
  // Payload plano (sin undefined) para evitar rechazos de Firestore
  const payload = {
    enabled: normalized.enabled,
    durationMinutes: normalized.durationMinutes,
    weekly: sanitizeWeekly(normalized.weekly),
  }
  await updateDoc(doc(db, "products", serviceId), {
    serviceSchedule: payload,
    updatedAt: serverTimestamp(),
  })
  return payload
}

async function requestServiceAppointmentClient(input: {
  serviceId: string
  sellerId: string
  serviceName: string
  buyerId: string
  buyerName?: string | null
  buyerEmail?: string | null
  start: Date
  end: Date
  notes?: string
}): Promise<string> {
  const lockId = slotLockId(input.serviceId, input.start)
  const lockRef = doc(db, SLOT_LOCKS, lockId)
  const apptRef = doc(collection(db, COLLECTION))

  try {
    await runTransaction(db, async (tx) => {
      const lockSnap = await tx.get(lockRef)
      if (lockSnap.exists()) {
        const lockStatus = String(lockSnap.data()?.status || "")
        if (lockStatus === "held" || isBlockingAppointmentStatus(lockStatus)) {
          throw new Error("Ese horario ya no está disponible. Elegí otro turno.")
        }
      }

      // Doble chequeo contra reservas existentes del servicio
      // (lectura fuera de tx no es atómica; el lock es la garantía fuerte)
      tx.set(apptRef, {
        serviceId: input.serviceId,
        serviceName: input.serviceName,
        sellerId: input.sellerId,
        buyerId: input.buyerId,
        buyerName: input.buyerName || null,
        buyerEmail: input.buyerEmail || null,
        startAt: input.start,
        endAt: input.end,
        status: "pending" satisfies ServiceAppointmentStatus,
        notes: input.notes?.trim() || null,
        slotLockId: lockId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      tx.set(lockRef, {
        serviceId: input.serviceId,
        sellerId: input.sellerId,
        buyerId: input.buyerId,
        appointmentId: apptRef.id,
        startAt: input.start,
        endAt: input.end,
        status: "held",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No se pudo pedir el turno."
    if (msg.includes("disponible") || msg.includes("already")) {
      throw new Error("Ese horario ya no está disponible. Elegí otro turno.")
    }
    // Si las reglas bloquean slot locks, caer a chequeo clásico + create
    const existing = await fetchAppointmentsForService(input.serviceId, {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })
    const conflict = existing.some((a) => {
      if (!isBlockingAppointmentStatus(a.status)) return false
      const s = toDate(a.startAt)
      const e = toDate(a.endAt)
      if (!s || !e) return false
      return rangesOverlap(input.start, input.end, s, e)
    })
    if (conflict) {
      throw new Error("Ese horario ya no está disponible. Elegí otro turno.")
    }
    await runTransaction(db, async (tx) => {
      tx.set(apptRef, {
        serviceId: input.serviceId,
        serviceName: input.serviceName,
        sellerId: input.sellerId,
        buyerId: input.buyerId,
        buyerName: input.buyerName || null,
        buyerEmail: input.buyerEmail || null,
        startAt: input.start,
        endAt: input.end,
        status: "pending" satisfies ServiceAppointmentStatus,
        notes: input.notes?.trim() || null,
        slotLockId: lockId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  }

  const when = input.start.toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  await createAppNotification({
    userId: input.buyerId,
    type: "service",
    title: "Reserva enviada",
    body: `Pediste turno para "${input.serviceName}" el ${when}. Te avisamos cuando el prestador confirme.`,
    link: "/dashboard/buyer?tab=appointments",
    dedupeKey: `service_appt_buyer_${apptRef.id}_pending`,
    meta: { appointmentId: apptRef.id, serviceId: input.serviceId },
  })

  await createAppNotification({
    userId: input.sellerId,
    type: "service",
    title: "Nueva reserva de servicio",
    body: `${input.buyerName || "Un cliente"} pidió turno para "${input.serviceName}" el ${when}.`,
    link: "/dashboard/seller?tab=agenda",
    dedupeKey: `service_appt_created_${apptRef.id}`,
    meta: { appointmentId: apptRef.id, serviceId: input.serviceId },
  })

  return apptRef.id
}

export async function requestServiceAppointment(input: {
  serviceId: string
  sellerId: string
  serviceName: string
  buyerId: string
  buyerName?: string | null
  buyerEmail?: string | null
  start: Date
  end: Date
  notes?: string
}): Promise<string> {
  const { auth } = await import("@/lib/firebase")
  const token = await auth.currentUser?.getIdToken(true)
  if (!token) {
    throw new Error("Tenés que iniciar sesión para pedir un turno.")
  }

  try {
    const res = await fetch("/api/services/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        serviceId: input.serviceId,
        start: input.start.toISOString(),
        end: input.end.toISOString(),
        notes: input.notes || "",
        buyerName: input.buyerName || null,
        buyerEmail: input.buyerEmail || null,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data.appointmentId) {
      if (data.warning) console.warn("Appointment warning:", data.warning)
      // Si el server creó el turno pero fallaron avisos, completar en cliente
      if (!Array.isArray(data.notificationIds) || data.notificationIds.length < 2) {
        await syncAppointmentNotificationsForUser(input.buyerId)
        // El vendedor se sincroniza al abrir Agenda
      }
      return String(data.appointmentId)
    }
    console.warn("API appointments failed, using client fallback:", data.error || res.status)
  } catch (err) {
    console.warn("API appointments unavailable, using client fallback:", err)
  }

  return requestServiceAppointmentClient(input)
}

/**
 * Crea en el buzón del usuario los avisos de turnos que le faltan
 * (útil si las reglas impiden escribir notificaciones a otro uid).
 */
export async function syncAppointmentNotificationsForUser(userId: string): Promise<number> {
  if (!userId) return 0
  let created = 0

  const [asBuyer, asSeller] = await Promise.all([
    fetchBuyerAppointments(userId).catch(() => [] as ServiceAppointment[]),
    fetchSellerAppointments(userId).catch(() => [] as ServiceAppointment[]),
  ])

  for (const appt of asBuyer) {
    if (appt.status !== "pending" && appt.status !== "confirmed") continue
    const when = formatAppointmentWhen(appt)
    const id = await createAppNotification({
      userId,
      type: "service",
      title: appt.status === "confirmed" ? "Turno confirmado" : "Reserva enviada",
      body:
        appt.status === "confirmed"
          ? `Tu turno para "${appt.serviceName}" (${when}) está confirmado.`
          : `Pediste turno para "${appt.serviceName}" (${when}). Esperá la confirmación del prestador.`,
      link: "/dashboard/buyer?tab=appointments",
      dedupeKey: `service_appt_buyer_${appt.id}_${appt.status}`,
      meta: { appointmentId: appt.id, serviceId: appt.serviceId, status: appt.status },
    })
    if (id) created += 1
  }

  for (const appt of asSeller) {
    if (appt.status !== "pending") continue
    const when = formatAppointmentWhen(appt)
    const id = await createAppNotification({
      userId,
      type: "service",
      title: "Nueva reserva de servicio",
      body: `${appt.buyerName || "Un cliente"} pidió turno para "${appt.serviceName}" (${when}).`,
      link: "/dashboard/seller?tab=agenda",
      dedupeKey: `service_appt_created_${appt.id}`,
      meta: { appointmentId: appt.id, serviceId: appt.serviceId },
    })
    if (id) created += 1
  }

  return created
}

export async function updateAppointmentStatus(params: {
  appointmentId: string
  status: ServiceAppointmentStatus
  actorId: string
}): Promise<void> {
  const ref = doc(db, COLLECTION, params.appointmentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("La reserva no existe.")
  const data = snap.data() as Omit<ServiceAppointment, "id">

  const isSeller = data.sellerId === params.actorId
  const isBuyer = data.buyerId === params.actorId
  if (!isSeller && !isBuyer) throw new Error("No tenés permiso para esta reserva.")

  // Cliente solo puede cancelar
  if (isBuyer && !isSeller && params.status !== "cancelled") {
    throw new Error("Solo podés cancelar tu reserva.")
  }

  await updateDoc(ref, {
    status: params.status,
    updatedAt: serverTimestamp(),
  })

  // Liberar horario si ya no bloquea (cancelado / rechazado / completado)
  const start = toDate(data.startAt)
  if (!isBlockingAppointmentStatus(params.status) && start) {
    const lockId =
      (typeof (data as { slotLockId?: string }).slotLockId === "string" &&
        (data as { slotLockId?: string }).slotLockId) ||
      slotLockId(data.serviceId, start)
    try {
      await updateDoc(doc(db, SLOT_LOCKS, lockId), {
        status: "released",
        releasedReason: params.status,
        updatedAt: serverTimestamp(),
      })
    } catch {
      /* el candado puede no existir en reservas viejas */
    }
  }
  const when = start
    ? start.toLocaleString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "fecha acordada"

  const messages: Record<ServiceAppointmentStatus, { title: string; body: string }> = {
    pending: { title: "Reserva pendiente", body: `Tu turno para “${data.serviceName}” quedó pendiente.` },
    confirmed: {
      title: "Turno confirmado",
      body: `Tu turno para “${data.serviceName}” el ${when} fue confirmado.`,
    },
    completed: {
      title: "Turno completado",
      body: `El servicio “${data.serviceName}” quedó marcado como completado.`,
    },
    cancelled: {
      title: "Turno cancelado",
      body: `Se canceló el turno de “${data.serviceName}” (${when}).`,
    },
    rejected: {
      title: "Turno rechazado",
      body: `El prestador no pudo aceptar el turno de “${data.serviceName}” (${when}).`,
    },
  }

  const msg = messages[params.status]
  const notifyUserId = isSeller ? data.buyerId : data.sellerId
  const link = isSeller ? "/dashboard/buyer?tab=appointments" : "/dashboard/seller?tab=agenda"

  try {
    await dispatchAppNotifications([
      {
        userId: notifyUserId,
        type: "service",
        title: msg.title,
        body: msg.body,
        link,
        dedupeKey: `service_appt_${params.appointmentId}_${params.status}`,
        meta: { appointmentId: params.appointmentId, status: params.status },
      },
    ])
  } catch (err) {
    console.error("No se pudo crear aviso de estado de turno:", err)
  }
}

export function appointmentStartDate(a: ServiceAppointment): Date | null {
  return toDate(a.startAt)
}

export function formatAppointmentWhen(a: ServiceAppointment): string {
  const start = toDate(a.startAt)
  const end = toDate(a.endAt)
  if (!start) return "Sin fecha"
  const day = start.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  const from = formatHm(start)
  const to = end ? formatHm(end) : ""
  return to ? `${day} · ${from} – ${to}` : `${day} · ${from}`
}
