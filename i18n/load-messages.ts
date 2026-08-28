import { defaultLocale, type AppLocale } from "./config"
import type { AppMessages } from "./messages.es"

/**
 * Carga diferida por idioma: cada bundle queda en su propio chunk, así el
 * cliente sólo descarga el idioma activo en lugar de los dos (~180 KB cada uno).
 */
const loaders: Record<AppLocale, () => Promise<{ default: AppMessages }>> = {
  es: () => import("./messages.es"),
  "pt-BR": () => import("./messages.pt-BR"),
}

export async function loadMessages(locale: AppLocale): Promise<AppMessages> {
  const load = loaders[locale] ?? loaders[defaultLocale]
  const mod = await load()
  return mod.default
}
