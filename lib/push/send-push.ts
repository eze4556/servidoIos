import { db, messaging } from "@/lib/firebase-admin"
import {
  ANDROID_CHANNEL_ID,
  PUSH_TOKEN_OWNERS_COLLECTION,
  PUSH_TOKENS_SUBCOLLECTION,
} from "@/lib/push/constants"

/**
 * Envío de notificaciones push a los dispositivos de un usuario.
 *
 * Los tokens viven en users/{uid}/pushTokens/{token}: el id del documento es el
 * propio token, así que registrar dos veces el mismo dispositivo no duplica
 * nada y borrar uno inválido es directo.
 *
 * FCM sólo alcanza a la app nativa. La campanita dentro de la web sigue
 * saliendo del documento en Firestore, que es la fuente de verdad; el push es
 * un aviso adicional.
 */
type PushPayload = {
  title: string
  body: string
  /** Ruta interna a abrir al tocar la notificación. */
  link?: string | null
  type?: string
}

/** Códigos con los que FCM avisa que el token ya no sirve y hay que borrarlo. */
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
])

function tokensRef(userId: string) {
  return db.collection("users").doc(userId).collection(PUSH_TOKENS_SUBCOLLECTION)
}

async function deleteDeadToken(userId: string, token: string): Promise<void> {
  const ownerRef = db.collection(PUSH_TOKEN_OWNERS_COLLECTION).doc(token)
  await db.runTransaction(async (transaction) => {
    const ownerSnap = await transaction.get(ownerRef)
    if (ownerSnap.data()?.userId === userId) transaction.delete(ownerRef)
    transaction.delete(tokensRef(userId).doc(token))
  })
}

/**
 * Nunca lanza: una push que falla no debe tumbar la operación que la disparó
 * (crear el pedido, el reclamo, el mensaje). Se registra y sigue.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const uid = String(userId || "").trim()
    if (!uid) return

    const snap = await tokensRef(uid).get()
    const tokens = snap.docs.map((doc) => doc.id).filter(Boolean)
    if (tokens.length === 0) return

    let successCount = 0
    let failureCount = 0
    const dead: string[] = []

    // FCM admite como máximo 500 tokens por multicast.
    for (let offset = 0; offset < tokens.length; offset += 500) {
      const chunk = tokens.slice(offset, offset + 500)
      const result = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body },
        // El data payload es lo que lee la app al tocar la notificación para
        // saber a dónde navegar. FCM exige que todos los valores sean strings.
        data: {
          link: payload.link || "",
          type: payload.type || "system",
        },
        android: {
          priority: "high",
          notification: {
            channelId: ANDROID_CHANNEL_ID,
            icon: "ic_stat_servido",
            color: "#6d28d9",
          },
        },
      })

      successCount += result.successCount
      failureCount += result.failureCount
      result.responses.forEach((response, index) => {
        if (response.error && DEAD_TOKEN_CODES.has(response.error.code)) {
          dead.push(chunk[index])
        }
      })
    }

    await Promise.all(dead.map((token) => deleteDeadToken(uid, token)))

    if (failureCount > 0) {
      console.warn(
        `[push] ${successCount}/${tokens.length} entregadas a ${uid}; ${dead.length} tokens dados de baja`
      )
    }
  } catch (error) {
    console.error("[push] no se pudo enviar", error)
  }
}
