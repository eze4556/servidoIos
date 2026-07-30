type StoryTimeTranslate = (key: string, values?: { count?: number }) => string

/** Tiempo relativo corto estilo historias (“hace 2 h” / “há 2 h”). */
export function formatStoryRelativeTime(
  date: Date,
  options?: { now?: Date; t?: StoryTimeTranslate }
): string {
  const now = options?.now ?? new Date()
  const t = options?.t
  const diffMs = Math.max(0, now.getTime() - date.getTime())
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 45) return t ? t("now") : "ahora"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t ? t("minutesAgo", { count: minutes }) : `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t ? t("hoursAgo", { count: hours }) : `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return t ? t("daysAgo", { count: days }) : `hace ${days} d`
}
