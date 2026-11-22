export const REPORT_KINDS = ["user", "product", "story", "live", "chat", "vehicle", "property", "restaurant", "review", "question"] as const
export type ReportKind = typeof REPORT_KINDS[number]
export const REPORT_REASONS = ["harassment", "sexual", "violence", "fraud", "spam", "other"] as const
export type ReportReason = typeof REPORT_REASONS[number]

export function validSafetyId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && !/[/.\s]/.test(value)
}

export function parseReport(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("INVALID_REPORT")
  const data = body as Record<string, unknown>
  if (!REPORT_KINDS.includes(data.kind as ReportKind) || !validSafetyId(data.targetId) ||
      !REPORT_REASONS.includes(data.reason as ReportReason) ||
      (data.details !== undefined && (typeof data.details !== "string" || data.details.length > 1000))) {
    throw new Error("INVALID_REPORT")
  }
  return { kind: data.kind as ReportKind, targetId: data.targetId, reason: data.reason as ReportReason, details: String(data.details || "").trim() }
}
