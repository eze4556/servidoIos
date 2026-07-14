"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { subscribeUserChats, type ChatListItem } from "@/lib/story-chat"
import { playIncomingMessageSound } from "@/lib/chat-presence"

type ChatUnreadContextValue = {
  unreadCount: number
  unreadByChatId: Record<string, boolean>
  chats: ChatListItem[]
}

const ChatUnreadContext = createContext<ChatUnreadContextValue>({
  unreadCount: 0,
  unreadByChatId: {},
  chats: [],
})

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return 0
}

/** Un chat tiene mensajes nuevos si el último no lo mandé yo y no lo leí todavía. */
export function isChatUnread(chat: ChatListItem, uid: string): boolean {
  const lastMsg = toMillis(chat.lastMessageTimestamp)
  if (!lastMsg || !chat.lastMessage) return false

  // Si sabemos quién mandó el último y fui yo → leído (para mí)
  if (chat.lastMessageSenderId && chat.lastMessageSenderId === uid) return false

  // Sin senderId (chats viejos): si nunca lo abrí o abrí antes del último mensaje → no leído
  const readMs = toMillis(chat.lastReadAt?.[uid])
  if (!readMs) return true
  return lastMsg > readMs + 300
}

export function useChatUnread() {
  return useContext(ChatUnreadContext)
}

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const primedRef = useRef(false)
  const lastTsRef = useRef(new Map<string, number>())
  const [chats, setChats] = useState<ChatListItem[]>([])

  pathnameRef.current = pathname

  useEffect(() => {
    if (typeof window === "undefined") return
    const silentUnlock = () => {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!Ctx) return
        const ctx = new Ctx()
        void ctx.resume().then(() => void ctx.close())
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("pointerdown", silentUnlock, { once: true })
    return () => window.removeEventListener("pointerdown", silentUnlock)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setChats([])
      primedRef.current = false
      lastTsRef.current.clear()
      return
    }
    const uid = currentUser.firebaseUser.uid

    return subscribeUserChats(uid, (list) => {
      setChats(list)

      if (!primedRef.current) {
        list.forEach((c) => lastTsRef.current.set(c.id, toMillis(c.lastMessageTimestamp)))
        primedRef.current = true
        return
      }

      for (const chat of list) {
        const ts = toMillis(chat.lastMessageTimestamp)
        const prev = lastTsRef.current.get(chat.id) || 0
        if (ts <= prev) continue
        lastTsRef.current.set(chat.id, ts)

        const fromOther = !chat.lastMessageSenderId || chat.lastMessageSenderId !== uid
        const viewingThis = pathnameRef.current === `/chat/${chat.id}`
        if (fromOther && !viewingThis && isChatUnread(chat, uid)) {
          playIncomingMessageSound()
        }
      }
    })
  }, [currentUser?.firebaseUser.uid])

  const { unreadCount, unreadByChatId } = useMemo(() => {
    const uid = currentUser?.firebaseUser.uid
    const map: Record<string, boolean> = {}
    if (!uid) return { unreadCount: 0, unreadByChatId: map }
    let count = 0
    for (const chat of chats) {
      const unread = isChatUnread(chat, uid)
      map[chat.id] = unread
      if (unread) count += 1
    }
    return { unreadCount: count, unreadByChatId: map }
  }, [chats, currentUser?.firebaseUser.uid])

  const value = useMemo(
    () => ({ unreadCount, unreadByChatId, chats }),
    [unreadCount, unreadByChatId, chats]
  )

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>
}
