/** ID fijo del remitente oficial (no es un usuario Firebase Auth real). */
export const SERVIDO_OFFICIAL_USER_ID = "servido_official"

/** Logo del canal oficial (ícono app morado «Servido»). */
export const SERVIDO_OFFICIAL_LOGO_PATH = "/images/servido-official-avatar.jpg"

export function isServidoOfficialNotification(meta: Record<string, unknown> | null | undefined): boolean {
  return meta?.fromServidoOfficial === true
}

export function servidoChatIdForUser(userId: string): string {
  return `servido_${userId}`
}

export function isServidoOfficialChat(chat: {
  type?: string
  sellerId?: string
  id?: string
}): boolean {
  if (chat.type === "servido") return true
  if (chat.sellerId === SERVIDO_OFFICIAL_USER_ID) return true
  if (chat.id?.startsWith("servido_")) return true
  return false
}
