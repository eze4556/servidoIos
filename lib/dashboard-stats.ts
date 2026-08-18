export const CHART_COLORS = [
  "#0d9488",
  "#f59e0b",
  "#2563eb",
  "#e11d48",
  "#7c3aed",
  "#16a34a",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#db2777",
]

export type NamedValue = { name: string; value: number }

export function toJsDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate()
    } catch {
      return null
    }
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000)
  }
  if (typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === "string") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function lastNMonths(n: number, locale: string): { key: string; label: string }[] {
  const now = new Date()
  const months: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: monthKey(d),
      label: d.toLocaleDateString(locale, { month: "short" }),
    })
  }
  return months
}

export function bucketByMonth(
  items: { date: Date | null; amount: number }[],
  months: { key: string; label: string }[]
): { label: string; value: number }[] {
  const totals = new Map(months.map((m) => [m.key, 0]))
  for (const item of items) {
    if (!item.date) continue
    const key = monthKey(item.date)
    if (!totals.has(key)) continue
    totals.set(key, (totals.get(key) || 0) + item.amount)
  }
  return months.map((m) => ({ label: m.label, value: Math.round((totals.get(m.key) || 0) * 100) / 100 }))
}

export function countByName(items: string[]): NamedValue[] {
  const map = new Map<string, number>()
  for (const name of items) {
    const key = name || "—"
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function sumByName(items: { name: string; amount: number }[]): NamedValue[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = item.name || "—"
    map.set(key, (map.get(key) || 0) + item.amount)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}
