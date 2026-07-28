import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { defaultLocale, isAppLocale, LOCALE_COOKIE, type AppLocale } from "./config"
import esMessages from "../messages/es.json"
import ptBRMessages from "../messages/pt-BR.json"

const messagesByLocale: Record<AppLocale, typeof esMessages> = {
  es: esMessages,
  "pt-BR": ptBRMessages,
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value
  const locale: AppLocale = isAppLocale(fromCookie) ? fromCookie : defaultLocale

  return {
    locale,
    messages: messagesByLocale[locale] ?? messagesByLocale[defaultLocale],
  }
})
