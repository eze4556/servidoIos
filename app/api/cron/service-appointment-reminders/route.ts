import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"

export const runtime = "nodejs"

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const until = new Date(now.getTime() + 25 * 60 * 60 * 1000)
    const snap = await db
      .collection("serviceAppointments")
      .where("startAt", ">", Timestamp.fromDate(now))
      .where("startAt", "<=", Timestamp.fromDate(until))
      .get()

    let appointments = 0
    let notifications = 0

    for (const docSnap of snap.docs) {
      const data = docSnap.data()
      if (data.status !== "confirmed") continue
      const start = data.startAt?.toDate?.() as Date | undefined
      if (!start) continue
      const minutes = (start.getTime() - now.getTime()) / 60_000
      const window = minutes >= 45 && minutes <= 75 ? "1h" : minutes >= 1425 && minutes <= 1455 ? "24h" : null
      if (!window) continue

      appointments++
      const when = start.toLocaleString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      })
      const body = `Tu turno para "${data.serviceName || "el servicio"}" es ${window === "1h" ? "en aproximadamente una hora" : `el ${when}`}.`
      const recipients = [
        { id: String(data.buyerId || ""), link: "/dashboard/buyer?tab=appointments" },
        { id: String(data.sellerId || ""), link: "/dashboard/seller?tab=agenda" },
      ].filter((recipient) => recipient.id)

      await Promise.all(
        recipients.map((recipient) =>
          createNotificationAdmin({
            userId: recipient.id,
            type: "service",
            title: window === "1h" ? "Tu turno comienza pronto" : "Recordatorio de turno",
            body,
            link: recipient.link,
            dedupeKey: `service_appt_reminder_${docSnap.id}_${window}_${recipient.id}`,
            meta: { appointmentId: docSnap.id, reminder: window },
          })
        )
      )
      notifications += recipients.length
    }

    return NextResponse.json({ ok: true, scanned: snap.size, appointments, notifications })
  } catch (error) {
    console.error("GET /api/cron/service-appointment-reminders", error)
    return NextResponse.json({ error: "No se pudieron procesar los recordatorios" }, { status: 500 })
  }
}
