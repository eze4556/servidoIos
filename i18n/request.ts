import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { defaultLocale, isAppLocale, LOCALE_COOKIE, type AppLocale } from "./config"
import esMessages from "../messages/es.json"
import ptBRMessages from "../messages/pt-BR.json"
import infoTermsEs from "../messages/legal/infoTerms.es.json"
import infoTermsPt from "../messages/legal/infoTerms.pt-BR.json"
import infoPrivacyEs from "../messages/legal/infoPrivacy.es.json"
import infoPrivacyPt from "../messages/legal/infoPrivacy.pt-BR.json"
import infoCareersEs from "../messages/legal/infoCareers.es.json"
import infoCareersPt from "../messages/legal/infoCareers.pt-BR.json"

function mergeLocaleMessages(base: typeof esMessages, legal: Record<string, unknown>) {
  return { ...base, ...legal } as typeof esMessages
}

const messagesByLocale: Record<AppLocale, typeof esMessages> = {
  es: mergeLocaleMessages(esMessages, { ...infoTermsEs, ...infoPrivacyEs, ...infoCareersEs }),
  "pt-BR": mergeLocaleMessages(ptBRMessages, { ...infoTermsPt, ...infoPrivacyPt, ...infoCareersPt }),
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
