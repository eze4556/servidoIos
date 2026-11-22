/** Baseline text filter. Reports and human moderation also cover images/video. */
export const OBJECTIONABLE_TEXT_PATTERN = "pornograf|pornogr[aá]f|pornografia infantil|sexo con menores|sexo com menores|te voy a matar|vou te matar|vou matar voc[eê]"
export function isAllowedContentText(value: unknown): boolean {
  if (value == null) return true
  return typeof value === "string" && value.length <= 20000 && !new RegExp(OBJECTIONABLE_TEXT_PATTERN, "iu").test(value)
}
