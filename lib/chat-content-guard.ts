export const CHAT_CONTENT_BLOCKED = "CHAT_CONTENT_BLOCKED"

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s]+/i

const DOMAIN_CONTACT_RE =
  /\b(?:wa\.me|whatsapp|whats\s*app|instagram|instagr(?:am|\.com)|facebook|face\s*book|fb\.com|fb\.me|telegram|t\.me|tiktok|tik\s*tok|twitter|x\.com|linkedin|youtube|youtu\.be)\b/i

/** 8+ digits with optional separators (phones, WhatsApp without keyword). */
const PHONE_RE =
  /(?:\+?\d[\d\s().-]{6,}\d|\b\d{8,}\b)/

const OBFUSCATED_AT_RE = /\b[\w.+-]+\s*(?:\(arroba\)|\[at\]|@\s*|\bat\b\s*)[\w.-]+\.(?:com|net|org|ar|br)\b/i

export type ChatContentGuardResult =
  | { allowed: true }
  | { allowed: false; reason: "contact" | "link" | "phone" | "email" }

export function validateChatMessageText(raw: string): ChatContentGuardResult {
  const text = raw.trim()
  if (!text) return { allowed: false, reason: "contact" }

  const normalized = text.replace(/\s+/g, " ")

  if (EMAIL_RE.test(normalized) || OBFUSCATED_AT_RE.test(normalized)) {
    return { allowed: false, reason: "email" }
  }
  if (URL_RE.test(normalized)) {
    return { allowed: false, reason: "link" }
  }
  if (DOMAIN_CONTACT_RE.test(normalized)) {
    return { allowed: false, reason: "contact" }
  }
  if (PHONE_RE.test(normalized)) {
    return { allowed: false, reason: "phone" }
  }

  return { allowed: true }
}

export function assertChatMessageAllowed(raw: string): void {
  const result = validateChatMessageText(raw)
  if (!result.allowed) {
    throw new Error(CHAT_CONTENT_BLOCKED)
  }
}
