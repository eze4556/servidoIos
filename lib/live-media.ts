/** Comprueba si el navegador puede pedir cámara/mic (HTTPS o localhost). */

export type LiveMediaSupport = {
  ok: boolean
  reason?: string
}

export function getLiveMediaSupport(): LiveMediaSupport {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Solo disponible en el dispositivo" }
  }

  const secure =
    window.isSecureContext ||
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"

  if (!secure) {
    return {
      ok: false,
      reason:
        "La cámara solo funciona en HTTPS o en la app instalada. Abrí servido.com.ar o usá el APK; no uses http://IP-local en el celular.",
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      reason:
        "Este navegador no permite cámara/micrófono. Probá Chrome actualizado o la app Servido.",
    }
  }

  return { ok: true }
}
