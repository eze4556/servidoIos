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

async function authorizedFetch(method: "POST" | "DELETE", token: string) {
  const idToken = await auth?.currentUser?.getIdToken()
  if (!idToken) return
  await fetch(apiUrl("/api/push/register"), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  })
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
  onOpenLink: (href: string) => void
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
      visibility: 1,
    })
  }

  const listeners = [
    await PushNotifications.addListener("registration", (token) => {
      currentToken = token.value
      void authorizedFetch("POST", token.value)
    }),
    await PushNotifications.addListener("registrationError", (error) => {
      console.error("[push] no se pudo registrar el dispositivo", error)
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
    const { PushNotifications } = await import("@capacitor/push-notifications")
    await PushNotifications.unregister()
  } catch (error) {
    console.error("[push] no se pudo dar de baja el token", error)
  }
}
