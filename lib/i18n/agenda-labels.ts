import type { ServiceAppointmentStatus, WeekdayKey } from "@/types/service-appointments"

type LabelTranslate = (key: string) => string

export function getWeekdayLabel(t: LabelTranslate, key: WeekdayKey): string {
  return t(`weekdays.${key}`)
}

export function getAppointmentStatusLabel(t: LabelTranslate, status: ServiceAppointmentStatus): string {
  return t(`appointmentStatus.${status}`)
}
