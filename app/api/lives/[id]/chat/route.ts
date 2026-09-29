import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireBearerUid } from "@/lib/lives-auth"
import { LIVE_CHAT_MAX_LEN, LIVE_CHAT_MIN_INTERVAL_MS } from "@/types/live"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

const lastMessageAt = new Map<string, number>()

export async function POST(request: NextRequest, context: Ctx) {
  try {
    const auth = await requireBearerUid(request)
    if ("error" in auth) return auth.error

    const { id: liveId } = await context.params
    const body = await request.json().catch(() => ({}))
    const text = String(body?.text || "")
      .trim()
      .slice(0, LIVE_CHAT_MAX_LEN)

    if (!text) {
      return NextResponse.json({ error: "Escribí un mensaje" }, { status: 400 })
    }

    const rateKey = `${liveId}:${auth.uid}`
    const now = Date.now()
    const prev = lastMessageAt.get(rateKey) || 0
    if (now - prev < LIVE_CHAT_MIN_INTERVAL_MS) {
      return NextResponse.json({ error: "Esperá un segundo antes de mandar otro" }, { status: 429 })
    }
    lastMessageAt.set(rateKey, now)

    const liveSnap = await db.collection("lives").doc(liveId).get()
    if (!liveSnap.exists) {
      return NextResponse.json({ error: "Vivo no encontrado" }, { status: 404 })
    }
    if (liveSnap.data()?.status !== "live") {
      return NextResponse.json({ error: "El vivo ya terminó" }, { status: 410 })
    }

    const userSnap = await db.collection("users").doc(auth.uid).get()
    const userData = userSnap.data() || {}
    const userName = String(userData.name || userData.displayName || "Usuario")
    const userPhotoURL = (userData.photoURL as string | null | undefined) || null

    const ref = await db.collection("lives").doc(liveId).collection("messages").add({
      liveId,
      userId: auth.uid,
      userName,
      userPhotoURL,
      text,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ id: ref.id })
  } catch (err) {
    console.error("[lives/chat]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al enviar mensaje" },
      { status: 500 }
    )
  }
}
