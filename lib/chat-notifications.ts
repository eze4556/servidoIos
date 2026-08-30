import { dispatchAppNotifications } from "@/lib/notifications"

type ChatMessageNotificationInput = {
  chatId: string
  messageId: string
  recipientId: string
  senderName: string
  preview: string
}

/**
 * Genera campanita + push para un mensaje de chat.
 *
 * El href se guarda con formato web porque también se usa fuera del APK; al
 * abrirlo en la app, resolveStoredHref lo traduce a /chat?chatId=...
 */
export async function notifyChatMessage(input: ChatMessageNotificationInput): Promise<void> {
  const recipientId = String(input.recipientId || "").trim()
  if (!recipientId) return

  const senderName = String(input.senderName || "Alguien").trim().slice(0, 80)
  const preview = String(input.preview || "Nuevo mensaje").trim().slice(0, 180)

  await dispatchAppNotifications([
    {
      userId: recipientId,
      type: "chat",
      title: `Nuevo mensaje de ${senderName}`,
      body: preview,
      link: `/chat/${encodeURIComponent(input.chatId)}`,
      dedupeKey: `chat_message_${input.chatId}_${input.messageId}`,
      meta: {
        chatId: input.chatId,
        messageId: input.messageId,
        senderName,
      },
    },
  ])
}
