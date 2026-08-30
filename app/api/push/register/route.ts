import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { auth as adminAuth, db } from "@/lib/firebase-admin"
import {
  PUSH_TOKEN_OWNERS_COLLECTION,
  PUSH_TOKENS_SUBCOLLECTION,
} from "@/lib/push/constants"

/**
 * Alta y baja del token FCM del dispositivo.
 *
 * Se escribe desde el servidor con el admin SDK en lugar de dejar que el
 * cliente toque Firestore directo: así el token queda bajo el uid que verificó
 * el backend y no hace falta abrir reglas de escritura sobre users/{uid}.
 */
async function requireUid(request: NextRequest): Promise<string | null> {
  const header = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!header?.startsWith("Bearer ")) return null
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7).trim())
    return decoded.uid
  } catch {
    return null
  }
}

function tokenDoc(uid: string, token: string) {
  return db.collection("users").doc(uid).collection(PUSH_TOKENS_SUBCOLLECTION).doc(token)
}

function ownerDoc(token: string) {
  return db.collection(PUSH_TOKEN_OWNERS_COLLECTION).doc(token)
}

function isValidToken(token: string): boolean {
  // Evita ids de documento arbitrarios y requests enormes. Los tokens FCM
  // actuales usan letras, números y estos separadores.
  return token.length >= 32 && token.length <= 512 && /^[A-Za-z0-9_:.-]+$/.test(token)
}

/** El body se lee una sola vez: un Request no se puede consumir dos veces. */
async function readBody(request: NextRequest): Promise<{ token: string; platform: string }> {
  const body = await request.json().catch(() => null)
  const requestedPlatform = String(body?.platform || "android").trim()
  return {
    token: String(body?.token || "").trim(),
    platform: ["android", "ios"].includes(requestedPlatform) ? requestedPlatform : "android",
  }
}

export async function POST(request: NextRequest) {
  const uid = await requireUid(request)
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { token, platform } = await readBody(request)
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  try {
    const ownerRef = ownerDoc(token)
    await db.runTransaction(async (transaction) => {
      const ownerSnap = await transaction.get(ownerRef)
      const previousUid = String(ownerSnap.data()?.userId || "").trim()

      // Un dispositivo puede cambiar de cuenta sin pasar por el botón de
      // logout. Se quita de la cuenta anterior antes de asignarlo a la nueva.
      if (previousUid && previousUid !== uid) {
        transaction.delete(tokenDoc(previousUid, token))
      }

      transaction.set(
        tokenDoc(uid, token),
        { token, platform, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
      transaction.set(
        ownerRef,
        { userId: uid, platform, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/push/register", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const uid = await requireUid(request)
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { token } = await readBody(request)
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  try {
    const ownerRef = ownerDoc(token)
    await db.runTransaction(async (transaction) => {
      const ownerSnap = await transaction.get(ownerRef)
      // Solo el dueño actual puede borrar el índice global. La subcolección
      // propia sí se limpia siempre para sanar datos viejos.
      if (ownerSnap.data()?.userId === uid) transaction.delete(ownerRef)
      transaction.delete(tokenDoc(uid, token))
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/push/register", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
