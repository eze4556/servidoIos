"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { subscribeUserChats, type ChatListItem } from "@/lib/story-chat"
import { isChatUnread, useChatUnread } from "@/components/chat/chat-unread-context"
import { Button } from "@/components/ui/button"
import { Loader2, MessageCircle, Search } from "lucide-react"

export default function MensajesPage() {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const { unreadByChatId } = useChatUnread()
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!authLoading && !currentUser) router.push("/login")
  }, [authLoading, currentUser, router])

  useEffect(() => {
    if (!currentUser) return
    const uid = currentUser.firebaseUser.uid
    setLoading(true)
    setError(null)

    const unsub = subscribeUserChats(
      uid,
      (list) => {
        setChats(list)
        setLoading(false)
      },
      () => {
        setError("No se pudieron cargar los mensajes. Recargá la página.")
        setLoading(false)
      }
    )

    return () => unsub()
  }, [currentUser?.firebaseUser.uid])

  if (authLoading || !currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  const uid = currentUser.firebaseUser.uid
  const filtered = chats.filter((chat) => {
    if (!query.trim()) return true
    const other = uid === chat.buyerId ? chat.sellerName : chat.buyerName
    return (
      other?.toLowerCase().includes(query.toLowerCase()) ||
      chat.lastMessage?.toLowerCase().includes(query.toLowerCase())
    )
  })

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col bg-white lg:min-h-screen lg:border-x lg:border-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-servido-800 text-white">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">Chats</h1>
            <p className="text-xs text-gray-500">Respuestas a historias y mensajes</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar chat"
            className="h-10 w-full rounded-full bg-gray-100 pl-9 pr-4 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-servido-700/20"
          />
        </div>
      </header>

      <div className="flex-1">
        {error && (
          <div className="m-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}{" "}
            <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
              Recargar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-800">
              <MessageCircle className="h-8 w-8" />
            </span>
            <p className="font-semibold text-gray-900">
              {chats.length === 0 ? "Todavía no tenés chats" : "Sin resultados"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {chats.length === 0
                ? "Respondé una historia para empezar a chatear."
                : "Probá con otro nombre."}
            </p>
            {chats.length === 0 && (
              <Button asChild className="mt-5 rounded-full bg-servido-800">
                <Link href="/historias">Ver historias</Link>
              </Button>
            )}
          </div>
        ) : (
          <ul>
            {filtered.map((chat) => {
              const other = uid === chat.buyerId ? chat.sellerName : chat.buyerName
              const unread = unreadByChatId[chat.id] ?? isChatUnread(chat, uid)
              const time = chat.lastMessageTimestamp?.toMillis
                ? new Date(chat.lastMessageTimestamp.toMillis()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""
              return (
                <li key={chat.id}>
                  <Link
                    href={`/chat/${chat.id}`}
                    className={`flex items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition active:bg-gray-50 ${
                      unread ? "bg-servido-50/60" : ""
                    }`}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
                      {chat.type === "story" && chat.storyImageUrl ? (
                        <Image src={chat.storyImageUrl} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg font-bold text-servido-800">
                          {other?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={`truncate ${
                            unread ? "font-bold text-gray-900" : "font-semibold text-gray-900"
                          }`}
                        >
                          {other}
                        </p>
                        <span
                          className={`shrink-0 text-[11px] ${
                            unread ? "font-semibold text-servido-800" : "text-gray-400"
                          }`}
                        >
                          {time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`min-w-0 flex-1 truncate text-sm ${
                            unread ? "font-semibold text-gray-800" : "text-gray-500"
                          }`}
                        >
                          {chat.lastMessage || (chat.type === "story" ? "Chat de historia" : "Chat")}
                        </p>
                        {unread && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-servido-800 px-1.5 text-[11px] font-bold text-white">
                            1
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
