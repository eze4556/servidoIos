"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { initPushNotifications, isPushAvailable } from "@/lib/push/register"
import { resolveStoredHref } from "@/lib/routes"

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

  useEffect(() => {
    if (!uid || !isPushAvailable()) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    void initPushNotifications((link) => {
      // El link viene guardado como path de la web; hay que traducirlo al
      // formato con query que usa la app antes de navegar.
      router.push(resolveStoredHref(link))
    }).then((remove) => {
      if (cancelled) remove()
      else cleanup = remove
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [uid, router])

  return null
}
