"use client"

import { useEffect, useRef, useState } from "react"
import { NextIntlClientProvider } from "next-intl"
import type { AppLocale } from "@/i18n/config"
import { LOCALE_CHANGE_EVENT, readLocaleCookie } from "@/i18n/client-locale"
import { loadMessages } from "@/i18n/load-messages"

interface IntlProviderProps {
  initialLocale: AppLocale
  initialMessages: Record<string, unknown>
  children: React.ReactNode
}

export function IntlProvider({
  initialLocale,
  initialMessages,
  children,
}: IntlProviderProps) {
  const [locale, setLocale] = useState<AppLocale>(initialLocale)
  const [messages, setMessages] = useState(initialMessages)
  // Evita que una carga lenta sobrescriba un cambio de idioma posterior.
  const requestRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    const apply = async (next: AppLocale) => {
      const requestId = ++requestRef.current
      const loaded = await loadMessages(next)
      if (cancelled || requestRef.current !== requestId) return

      setMessages(loaded as unknown as Record<string, unknown>)
      setLocale(next)
      document.documentElement.lang = next === "pt-BR" ? "pt-BR" : "es"
    }

    // En el export estático el HTML sale siempre con el idioma por defecto,
    // así que acá se recupera la preferencia real del usuario.
    const stored = readLocaleCookie()
    if (stored && stored !== initialLocale) void apply(stored)

    const onChange = (event: Event) => {
      const next = (event as CustomEvent<AppLocale>).detail
      if (next) void apply(next)
    }

    window.addEventListener(LOCALE_CHANGE_EVENT, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(LOCALE_CHANGE_EVENT, onChange)
    }
  }, [initialLocale])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
