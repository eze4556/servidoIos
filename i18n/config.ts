export const locales = ["es", "pt-BR"] as const
export type AppLocale = (typeof locales)[number]
export const defaultLocale: AppLocale = "es"
export const LOCALE_COOKIE = "SERVIDO_LOCALE"

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "es" || value === "pt-BR"
}
