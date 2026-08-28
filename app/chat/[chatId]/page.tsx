import { Suspense } from "react"
import { ChatThread } from "../chat-thread"

/** Ruta de la web: /chat/abc. Ver la nota en product/[id]/page.tsx. */
export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatThread />
    </Suspense>
  )
}
