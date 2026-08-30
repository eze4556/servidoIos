"use client"

import { Capacitor } from "@capacitor/core"
import { auth } from "@/lib/firebase"
import { apiUrl } from "@/lib/api-base"
import { ANDROID_CHANNEL_ID } from "@/lib/push/constants"

/**
 * Registro del dispositivo en FCM y manejo del tap sobre la notificación.
 *
 * El plugin se importa de forma dinámica y sólo en nativo: en la web no existe
 * la implementación y, además, así no entra al bundle del sitio.
 */
export const isPushAvailable = () => Capacitor.isNativePlatform()

/** Se guarda para poder dar de baja el token exacto al cerrar sesión. */
let currentToken: string | null = null

export type ForegroundPush = {
  title: string
  body: string
  link?: string
}

async function authorizedFetch(method: "POST" | "DELETE", token: string) {
  const idToken = await auth?.currentUser?.getIdToken()
  if (!idToken) throw new Error("No hay una sesión válida para registrar push")
  const response = await fetch(apiUrl("/api/push/register"), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error || `No se pudo ${method === "POST" ? "registrar" : "borrar"} push (${response.status})`)
  }
}

/**
 * Pide permiso, registra el dispositivo y deja escuchando el tap.
 *
 * @param onOpenLink recibe el link que traía la notificación, ya listo para
 *   navegar. Se inyecta desde el componente para poder usar el router de Next
 *   en lugar de recargar la app entera con location.href.
 * @returns función para desmontar los listeners.
 */
export async function initPushNotifications(
  onOpenLink: (href: string) => void,
  onForegroundPush?: (notification: ForegroundPush) => void
): Promise<() => void> {
  if (!isPushAvailable()) return () => {}

  const { PushNotifications } = await import("@capacitor/push-notifications")

  // En Android 13+ esto muestra el diálogo de POST_NOTIFICATIONS. Si el usuario
  // dice que no, se sale sin registrar: no hay que insistir en cada arranque.
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== "granted") return () => {}

  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Servido",
      description: "Pedidos, mensajes y novedades",
      importance: 5,
      // Oculta el contenido sensible en la pantalla bloqueada.
      visibility: 0,
    })
  }

  const listeners = [
    await PushNotifications.addListener("registration", (token) => {
      const previousToken = currentToken
      currentToken = token.value
      void (async () => {
        // FCM puede rotar el token. Borrar el anterior evita duplicados hasta
        // que el servidor detecte que quedó inválido.
        if (previousToken && previousToken !== token.value) {
          await authorizedFetch("DELETE", previousToken).catch((error) => {
            console.warn("[push] no se pudo borrar el token anterior", error)
          })
        }
        await authorizedFetch("POST", token.value)
      })().catch((error) => {
        console.error("[push] el backend rechazó el registro", error)
      })
    }),
    await PushNotifications.addListener("registrationError", (error) => {
      console.error("[push] no se pudo registrar el dispositivo", error)
    }),
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      onForegroundPush?.({
        title: notification.title || "Servido",
        body: notification.body || "",
        link: typeof notification.data?.link === "string" ? notification.data.link : undefined,
      })
    }),
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = action.notification.data?.link
      if (typeof link === "string" && link) onOpenLink(link)
    }),
  ]

  await PushNotifications.register()

  return () => {
    for (const listener of listeners) void listener.remove()
  }
}

/**
 * Da de baja el token al cerrar sesión, para que el próximo usuario del
 * dispositivo no reciba las notificaciones del anterior.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!isPushAvailable() || !currentToken) return
  const token = currentToken
  currentToken = null

  try {
    await authorizedFetch("DELETE", token)
  } catch (error) {
    // Aunque no haya sesión o falle la API, revocar el token local impide que
    // el dispositivo siga recibiendo avisos de la cuenta anterior.
    console.warn("[push] no se pudo borrar el token del backend", error)
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications")
    await PushNotifications.unregister()
  } catch (error) {
    console.error("[push] no se pudo revocar el token del dispositivo", error)
  }
}
