"use client"

/**
 * Consentimiento explícito del cadete para compartir su ubicación durante un
 * pedido. Google Play exige un aviso destacado y una acción afirmativa del
 * usuario antes de empezar a recolectar ubicación, incluso en primer plano:
 * https://support.google.com/googleplay/android-developer/answer/9799150
 *
 * Se guarda por usuario y con versión, así un cambio de texto del aviso vuelve
 * a pedir el consentimiento en lugar de arrastrar uno viejo.
 */

const CONSENT_VERSION = 1
const STORAGE_PREFIX = "servido:cadete-location-consent"

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}:v${CONSENT_VERSION}:${uid}`
}

export function hasLocationConsent(uid: string | undefined | null): boolean {
  if (!uid || typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(storageKey(uid)) === "granted"
  } catch {
    return false
  }
}

export function grantLocationConsent(uid: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(uid), "granted")
  } catch {
    // Modo privado o storage lleno: el cadete tendrá que aceptar de nuevo.
  }
}

export function revokeLocationConsent(uid: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(storageKey(uid))
  } catch {
    // Sin storage no hay nada que borrar.
  }
}
