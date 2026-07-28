import { es, ptBR } from "date-fns/locale"
import type { AppLocale } from "@/i18n/config"

export function getDateFnsLocale(locale: string) {
  return locale === "pt-BR" ? ptBR : es
}
