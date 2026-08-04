/** ID fijo del remitente oficial (no es un usuario Firebase Auth real). */
export const SERVIDO_OFFICIAL_USER_ID = "servido_official"

/** Logo PNG (el .svg referencia logo.png y en avatares suele verse solo el círculo violeta). */
export const SERVIDO_OFFICIAL_LOGO_PATH = "/images/logo-192.png"

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
