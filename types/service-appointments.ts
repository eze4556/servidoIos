/** Día de la semana: 0 = domingo … 6 = sábado (igual que Date.getDay()) */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6"

export interface ServiceTimeRange {
  /** "HH:mm" 24h */
  start: string
  /** "HH:mm" 24h */
  end: string
}

/** Horarios semanales guardados en el producto (isService) */
export interface ServiceSchedule {
  enabled: boolean
  /** Duración de cada turno en minutos */
  durationMinutes: number
  /** Claves "0"…"6" → franjas del día */
  weekly: Partial<Record<WeekdayKey, ServiceTimeRange[]>>
}

export type ServiceAppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected"

export interface ServiceAppointment {
  id: string
  serviceId: string
  serviceName: string
  sellerId: string
  buyerId: string
  buyerName?: string | null
  buyerEmail?: string | null
  /** Inicio del turno (Timestamp / Date) */
  startAt: any
  /** Fin del turno */
  endAt: any
  status: ServiceAppointmentStatus
  notes?: string | null
  createdAt?: any
  updatedAt?: any
}

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
  "6": "Sábado",
  "0": "Domingo",
}

/** Orden UI: lun → dom */
export const WEEKDAY_ORDER: WeekdayKey[] = ["1", "2", "3", "4", "5", "6", "0"]

export const APPOINTMENT_STATUS_LABELS: Record<ServiceAppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
  rejected: "Rechazado",
}

export const DEFAULT_SERVICE_SCHEDULE: ServiceSchedule = {
  enabled: false,
  durationMinutes: 60,
  weekly: {
    "1": [{ start: "09:00", end: "18:00" }],
    "2": [{ start: "09:00", end: "18:00" }],
    "3": [{ start: "09:00", end: "18:00" }],
    "4": [{ start: "09:00", end: "18:00" }],
    "5": [{ start: "09:00", end: "18:00" }],
  },
}
