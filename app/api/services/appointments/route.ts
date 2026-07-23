import { NextRequest, NextResponse } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

function slotLockId(serviceId: string, start: Date): string {
  return `${serviceId}_${start.getTime()}`
}

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    const body = await request.json().catch(() => null)

    const serviceId = String(body?.serviceId || "").trim()
    const start = parseDate(body?.start)
    const end = parseDate(body?.end)
    const notes = typeof body?.notes === "string" ? body.notes.trim() : ""

    if (!serviceId || !start || !end) {
      return NextResponse.json({ error: "Datos de turno incompletos" }, { status: 400 })
    }
    if (end.getTime() <= start.getTime()) {
      return NextResponse.json({ error: "Horario inválido" }, { status: 400 })
    }
    if (start.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: "Ese horario ya pasó" }, { status: 400 })
    }

    const productSnap = await db.collection("products").doc(serviceId).get()
    if (!productSnap.exists) {
      return NextResponse.json({ error: "El servicio no existe" }, { status: 404 })
    }

    const product = productSnap.data() || {}
    if (!product.isService) {
      return NextResponse.json({ error: "No es un servicio" }, { status: 400 })
    }

    const sellerId = String(product.sellerId || "").trim()
    if (!sellerId) {
      return NextResponse.json({ error: "El servicio no tiene vendedor" }, { status: 400 })
    }
    if (sellerId === decoded.uid) {
      return NextResponse.json({ error: "No podés reservar tu propio servicio" }, { status: 400 })
    }

    const schedule = product.serviceSchedule
    if (!schedule?.enabled) {
      return NextResponse.json({ error: "El prestador no acepta reservas online" }, { status: 400 })
    }

    const buyerSnap = await db.collection("users").doc(decoded.uid).get()
    const buyerData = buyerSnap.exists ? buyerSnap.data() || {} : {}
    const buyerName =
      String(body?.buyerName || buyerData.name || buyerData.displayName || "").trim() || null
    const buyerEmail =
      String(body?.buyerEmail || decoded.email || buyerData.email || "").trim() || null

    const serviceName = String(product.name || "Servicio")
    const lockId = slotLockId(serviceId, start)
    const lockRef = db.collection("serviceSlotLocks").doc(lockId)
    const apptRef = db.collection("serviceAppointments").doc()

    // Chequeo de solape (reservas viejas); el candado atómico evita carreras entre 2 clientes
    const existingSnap = await db
      .collection("serviceAppointments")
      .where("serviceId", "==", serviceId)
      .limit(150)
      .get()

    const conflict = existingSnap.docs.some((docSnap) => {
      const data = docSnap.data()
      if (data.status !== "pending" && data.status !== "confirmed") return false
      const s = data.startAt?.toDate?.() || parseDate(data.startAt)
      const e = data.endAt?.toDate?.() || parseDate(data.endAt)
      if (!s || !e) return false
      return rangesOverlap(start, end, s, e)
    })
    if (conflict) {
      return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 })
    }

    try {
      await db.runTransaction(async (tx) => {
        const lockSnap = await tx.get(lockRef)
        if (lockSnap.exists) {
          const lockStatus = String(lockSnap.data()?.status || "")
          if (lockStatus === "held" || lockStatus === "pending" || lockStatus === "confirmed") {
            throw new Error("SLOT_TAKEN")
          }
        }

        tx.set(apptRef, {
          serviceId,
          serviceName,
          sellerId,
          buyerId: decoded.uid,
          buyerName,
          buyerEmail,
          startAt: Timestamp.fromDate(start),
          endAt: Timestamp.fromDate(end),
          status: "pending",
          notes: notes || null,
          slotLockId: lockId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })

        tx.set(lockRef, {
          serviceId,
          sellerId,
          buyerId: decoded.uid,
          appointmentId: apptRef.id,
          startAt: Timestamp.fromDate(start),
          endAt: Timestamp.fromDate(end),
          status: "held",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("SLOT_TAKEN")) {
        return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 })
      }
      throw err
    }

    const when = start.toLocaleString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })

    const notificationIds: string[] = []
    try {
      const sellerNotif = await createNotificationAdmin({
        userId: sellerId,
        type: "service",
        title: "Nueva reserva de servicio",
        body: `${buyerName || "Un cliente"} pidió turno para "${serviceName}" el ${when}.`,
        link: "/dashboard/seller?tab=agenda",
        dedupeKey: `service_appt_created_${apptRef.id}`,
        meta: { appointmentId: apptRef.id, serviceId },
      })
      notificationIds.push(sellerNotif)

      const buyerNotif = await createNotificationAdmin({
        userId: decoded.uid,
        type: "service",
        title: "Reserva enviada",
        body: `Pediste turno para "${serviceName}" el ${when}. Te avisamos cuando el prestador confirme.`,
        link: "/dashboard/buyer?tab=appointments",
        dedupeKey: `service_appt_buyer_${apptRef.id}_pending`,
        meta: { appointmentId: apptRef.id, serviceId },
      })
      notificationIds.push(buyerNotif)
    } catch (notifErr) {
      console.error("Appointment created but notifications failed:", notifErr)
      return NextResponse.json({
        ok: true,
        appointmentId: apptRef.id,
        notificationIds,
        warning: "Turno creado, pero los avisos no se pudieron enviar.",
      })
    }

    return NextResponse.json({
      ok: true,
      appointmentId: apptRef.id,
      notificationIds,
    })
  } catch (error) {
    console.error("POST /api/services/appointments", error)
    const message = error instanceof Error ? error.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
