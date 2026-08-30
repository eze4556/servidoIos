"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import {
  initPushNotifications,
  isPushAvailable,
  unregisterPushToken,
} from "@/lib/push/register"
import { resolveStoredHref } from "@/lib/routes"

function safePushHref(link: unknown): string | null {
  if (typeof link !== "string") return null
  const trimmed = link.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null

  try {
    const parsed = new URL(trimmed, "https://localhost")
    if (parsed.origin !== "https://localhost") return null
    return resolveStoredHref(`${parsed.pathname}${parsed.search}${parsed.hash}`)
  } catch {
    return null
  }
}

/**
 * Registra el dispositivo en FCM cuando hay sesión.
 *
 * No renderiza nada. Se espera a tener usuario porque el token se guarda contra
 * su uid, y se corre sólo en nativo: en la web las notificaciones siguen siendo
 * la campanita.
 */
export function PushRegistrar() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const uid = currentUser?.firebaseUser?.uid
  const previousUidRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false

    void (async () => {
      const previousUid = previousUidRef.current
      previousUidRef.current = uid

      // Cubre cambio de cuenta, expiración de sesión y cualquier signOut que
      // no haya pasado por handleLogout. La baja explícita del logout puede
      // haberlo limpiado antes; repetirla es seguro.
      if (previousUid && previousUid !== uid) {
        await unregisterPushToken()
      }

      if (!uid || !isPushAvailable() || cancelled) return

      const remove = await initPushNotifications(
        (link) => {
          const href = safePushHref(link)
          if (href) router.push(href)
          else console.warn("[push] link descartado por no ser una ruta interna")
        },
        (notification) => {
          const href = safePushHref(notification.link)
          toast(notification.title, {
            description: notification.body || undefined,
            action: href
              ? {
                  label: "Abrir",
                  onClick: () => router.push(href),
                }
              : undefined,
          })
        }
      )
      if (cancelled) remove()
      else cleanup = remove
    })().catch((error) => {
      console.error("[push] no se pudo inicializar", error)
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [uid, router])

  return null
}
