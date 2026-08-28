/**
 * Constantes compartidas entre el envío (servidor) y el registro (cliente).
 *
 * Van en su propio archivo para que el cliente no tenga que importar
 * lib/push/send-push.ts, que arrastra firebase-admin al bundle.
 */

/** users/{uid}/pushTokens/{token} */
export const PUSH_TOKENS_SUBCOLLECTION = "pushTokens"

/**
 * Canal de Android. Lo crea el cliente al iniciar y el servidor lo nombra en
 * cada envío; si los dos ids no coinciden, Android usa un canal por defecto sin
 * sonido y las notificaciones pasan desapercibidas.
 */
export const ANDROID_CHANNEL_ID = "servido_default"
