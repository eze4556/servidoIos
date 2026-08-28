import { isAppLocale, LOCALE_COOKIE, type AppLocale } from "./config"

export const LOCALE_CHANGE_EVENT = "servido:locale-change"

export function readLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") return null

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`)
  )
  const value = match ? decodeURIComponent(match[1]) : null
  return isAppLocale(value) ? value : null
}

export function writeLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`
}

/**
 * Cambia el idioma sin ida y vuelta al servidor. En la web el cookie sigue
 * alimentando el render inicial; dentro del APK, donde no hay servidor, este
 * evento es lo único que aplica el cambio.
 */
export function switchLocale(locale: AppLocale) {
  writeLocaleCookie(locale)
  window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }))
}
