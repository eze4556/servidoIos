import { Suspense } from "react"
import { ChatThread } from "./chat-thread"

/** Entrada por query (/chat?chatId=abc) que usa el APK. */
export default function ChatByQueryPage() {
  return (
    <Suspense fallback={null}>
      <ChatThread />
    </Suspense>
  )
}
