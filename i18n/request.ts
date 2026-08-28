import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { defaultLocale, isAppLocale, LOCALE_COOKIE, type AppLocale } from "./config"
import { loadMessages } from "./load-messages"

// En el build de Capacitor (output: "export") no hay request: cookies() rompe el
// prerender. Se arranca con el idioma por defecto y IntlProvider lo corrige en
// el cliente leyendo la cookie al montar.
const isStaticExport = process.env.CAPACITOR === "1"

async function resolveLocale(): Promise<AppLocale> {
  if (isStaticExport) return defaultLocale

  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value
  return isAppLocale(fromCookie) ? fromCookie : defaultLocale
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
