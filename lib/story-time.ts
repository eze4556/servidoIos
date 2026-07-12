/**
 * Tiempo relativo corto estilo Instagram (“hace 2 h”).
 */
export function formatStoryRelativeTime(date: Date, now = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - date.getTime())
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 45) return "ahora"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}
