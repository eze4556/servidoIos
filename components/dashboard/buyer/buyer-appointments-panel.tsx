"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BuyerPanel } from "@/components/dashboard/buyer/buyer-panel"
import {
  formatAppointmentWhen,
  subscribeBuyerAppointments,
  syncAppointmentNotificationsForUser,
  updateAppointmentStatus,
} from "@/lib/service-appointments"
import type { ServiceAppointment } from "@/types/service-appointments"
import { APPOINTMENT_STATUS_LABELS } from "@/types/service-appointments"

type BuyerAppointmentsPanelProps = {
  buyerId: string
}

export function BuyerAppointmentsPanel({ buyerId }: BuyerAppointmentsPanelProps) {
  const [items, setItems] = useState<ServiceAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!buyerId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    void syncAppointmentNotificationsForUser(buyerId).catch(() => undefined)

    const unsub = subscribeBuyerAppointments(buyerId, (data) => {
      setItems(data)
      setLoading(false)
    })

    return () => unsub()
  }, [buyerId])

  const handleCancel = async (appointmentId: string) => {
    setBusyId(appointmentId)
    setError(null)
    try {
      await updateAppointmentStatus({
        appointmentId,
        status: "cancelled",
        actorId: buyerId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <BuyerPanel title="Mis turnos" description="Reservas de servicios que pediste">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando turnos...
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
            Todavía no pediste turnos.
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/services">Ver servicios</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {items.map((appt) => (
            <div key={appt.id} className="rounded-xl border p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{appt.serviceName}</p>
                  <p className="text-sm text-muted-foreground">{formatAppointmentWhen(appt)}</p>
                </div>
                <Badge variant={appt.status === "confirmed" ? "default" : "secondary"}>
                  {APPOINTMENT_STATUS_LABELS[appt.status]}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/product/${appt.serviceId}`}>Ver servicio</Link>
                </Button>
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === appt.id}
                    onClick={() => void handleCancel(appt.id)}
                  >
                    Cancelar turno
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </BuyerPanel>
  )
}
