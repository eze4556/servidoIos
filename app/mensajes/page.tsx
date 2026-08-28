"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { subscribeUserChats, type ChatListItem } from "@/lib/story-chat"
import { isServidoOfficialChat } from "@/lib/servido-official"
import { chatHref } from "@/lib/routes"
import { ServidoOfficialLabel } from "@/components/chat/servido-official-label"
import { ServidoOfficialAvatar } from "@/components/chat/servido-official-avatar"
import { isChatUnread, useChatUnread } from "@/components/chat/chat-unread-context"
import { Button } from "@/components/ui/button"
import { Loader2, MessageCircle, Search } from "lucide-react"

export default function MensajesPage() {
  const t = useTranslations("chat")
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
        setError(t("loadError"))
        setLoading(false)
      }
    )

    return () => unsub()
  }, [currentUser?.firebaseUser.uid, t])

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
    <div className="lg:min-h-screen lg:bg-gradient-to-b lg:from-slate-50 lg:via-white lg:to-purple-50/30 lg:py-8">
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col overflow-hidden bg-white lg:min-h-[calc(100vh-8rem)] lg:max-w-2xl lg:rounded-[1.75rem] lg:shadow-[0_24px_60px_-32px_rgba(46,16,101,0.32)] lg:ring-1 lg:ring-servido-950/5">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:border-servido-950/5 lg:px-6 lg:pt-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-servido-800 text-white lg:rounded-2xl lg:bg-servido-950 lg:text-servido-gold lg:shadow-md">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-servido-950 lg:font-semibold lg:tracking-tight">
              {t("listTitle")}
            </h1>
            <p className="text-xs text-slate-500">{t("listSubtitle")}</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-full bg-gray-100 pl-9 pr-4 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-servido-700/20 lg:bg-slate-100/80 lg:ring-1 lg:ring-servido-950/5"
          />
        </div>
      </header>

      <div className="flex-1">
        {error && (
          <div className="m-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}{" "}
            <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
              {t("reload")}
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
            <p className="font-semibold text-servido-950">
              {chats.length === 0 ? t("emptyNoChats") : t("emptyNoResults")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {chats.length === 0 ? t("emptyHintStories") : t("emptyHintSearch")}
            </p>
            {chats.length === 0 && (
              <Button
                asChild
                className="mt-6 rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
              >
                <Link href="/historias">{t("viewStories")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <ul>
            {filtered.map((chat) => {
              const isServido = isServidoOfficialChat(chat)
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
                    href={chatHref(chat.id)}
                    className={`flex items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition active:bg-gray-50 lg:px-6 lg:hover:bg-slate-50/80 ${
                      unread ? "bg-servido-50/60" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      {isServido ? (
                        <ServidoOfficialAvatar size={56} />
                      ) : (
                        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gray-100 ring-2 ring-servido-100">
                          {chat.type === "story" && chat.storyImageUrl ? (
                            <Image src={chat.storyImageUrl} alt="" fill className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-servido-800">
                              {other?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                      )}
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        {isServido ? (
                          <ServidoOfficialLabel nameClassName="text-base" />
                        ) : (
                          <p
                            className={`truncate ${
                              unread ? "font-bold text-servido-950" : "font-semibold text-servido-950"
                            }`}
                          >
                            {other}
                          </p>
                        )}
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
                          {chat.lastMessage ||
                            (isServido
                              ? t("servidoChat")
                              : chat.type === "story"
                                ? t("storyChat")
                                : t("genericChat"))}
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
    </div>
  )
}
