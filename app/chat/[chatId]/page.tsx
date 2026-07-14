"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { hideChatForUser } from "@/lib/story-chat"
import {
  formatLastSeen,
  getOtherLastReadMs,
  isMessageSeen,
  isUserOnline,
  markChatRead,
  playIncomingMessageSound,
  subscribeUserPresence,
  touchUserPresence,
} from "@/lib/chat-presence"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, CheckCheck, Info, Loader2, Send, Trash2 } from "lucide-react"

interface Chat {
  id: string
  type?: "product" | "story"
  productId?: string
  storyId?: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  buyerPhotoURL?: string
  sellerPhotoURL?: string
  productName?: string
  productImageUrl?: string
  storyImageUrl?: string | null
  storyCaption?: string | null
  lastMessage?: string
  deletedBy?: string[]
  lastReadAt?: Record<string, unknown>
}

interface Message {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: any
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser, authLoading } = useAuth()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherLastSeen, setOtherLastSeen] = useState<unknown>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const knownMessageIdsRef = useRef<Set<string>>(new Set())
  const primedSoundRef = useRef(false)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
    }
  }, [authLoading, currentUser, router])

  // Refresh "última vez" label
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  // Presence heartbeat while in chat
  useEffect(() => {
    if (!currentUser) return
    const uid = currentUser.firebaseUser.uid
    const beat = () => void touchUserPresence(uid)
    beat()
    const interval = window.setInterval(beat, 25_000)
    const onVis = () => {
      if (document.visibilityState === "visible") beat()
    }
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("focus", beat)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("focus", beat)
      void touchUserPresence(uid)
    }
  }, [currentUser])

  // Other user last seen
  useEffect(() => {
    if (!chat || !currentUser) return
    const uid = currentUser.firebaseUser.uid
    const otherId = uid === chat.buyerId ? chat.sellerId : chat.buyerId
    return subscribeUserPresence(otherId, setOtherLastSeen)
  }, [chat?.buyerId, chat?.sellerId, currentUser])

  // Mark as read when viewing
  useEffect(() => {
    if (!chatId || !currentUser || !chat) return
    const uid = currentUser.firebaseUser.uid
    void markChatRead(chatId, uid)
  }, [chatId, currentUser, chat?.id, messages.length])

  useEffect(() => {
    if (!chatId || !currentUser) return

    let cancelled = false
    let unsubscribeMessages: (() => void) | undefined
    let photosLoaded = false
    let participantsBackfilled = false
    knownMessageIdsRef.current = new Set()
    primedSoundRef.current = false
    setLoading(true)
    setError(null)

    const unsubscribeChat = onSnapshot(
      doc(db, "chats", chatId),
      (chatSnap) => {
        if (cancelled) return
        if (!chatSnap.exists()) {
          setError("Chat no encontrado.")
          setLoading(false)
          return
        }

        const chatData = { id: chatSnap.id, ...chatSnap.data() } as Chat
        const uid = currentUser.firebaseUser.uid

        if (uid !== chatData.buyerId && uid !== chatData.sellerId) {
          setError("No tenés permiso para ver este chat.")
          setLoading(false)
          return
        }

        if (Array.isArray(chatData.deletedBy) && chatData.deletedBy.includes(uid)) {
          setError("Este chat fue eliminado.")
          setLoading(false)
          return
        }

        const participants = (chatSnap.data() as { participantIds?: string[] }).participantIds
        if (
          !participantsBackfilled &&
          (!Array.isArray(participants) || participants.length < 2) &&
          chatData.buyerId &&
          chatData.sellerId
        ) {
          participantsBackfilled = true
          void updateDoc(doc(db, "chats", chatId), {
            participantIds: [chatData.buyerId, chatData.sellerId],
          }).catch(() => undefined)
        }

        setChat((prev) => ({
          ...chatData,
          buyerPhotoURL: prev?.id === chatData.id ? prev.buyerPhotoURL : undefined,
          sellerPhotoURL: prev?.id === chatData.id ? prev.sellerPhotoURL : undefined,
        }))

        if (!photosLoaded) {
          photosLoaded = true
          void Promise.all([
            getDoc(doc(db, "users", chatData.buyerId)),
            getDoc(doc(db, "users", chatData.sellerId)),
          ]).then(([buyerDoc, sellerDoc]) => {
            if (cancelled) return
            setChat((prev) =>
              prev
                ? {
                    ...prev,
                    buyerPhotoURL: buyerDoc.exists() ? buyerDoc.data().photoURL : undefined,
                    sellerPhotoURL: sellerDoc.exists() ? sellerDoc.data().photoURL : undefined,
                  }
                : prev
            )
          })
        }

        if (!unsubscribeMessages) {
          const messagesQuery = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "asc")
          )
          unsubscribeMessages = onSnapshot(
            messagesQuery,
            (snapshot) => {
              if (cancelled) return
              const next = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message))

              // Sonido solo para mensajes nuevos entrantes (no al cargar el historial)
              if (primedSoundRef.current) {
                const known = knownMessageIdsRef.current
                const incoming = next.filter(
                  (m) => !known.has(m.id) && m.senderId !== currentUser.firebaseUser.uid
                )
                if (incoming.length > 0) {
                  playIncomingMessageSound()
                  void markChatRead(chatId, currentUser.firebaseUser.uid)
                }
              } else {
                primedSoundRef.current = true
              }
              knownMessageIdsRef.current = new Set(next.map((m) => m.id))

              setMessages(next)
              setLoading(false)
            },
            (err) => {
              console.error(err)
              if (!cancelled) {
                setError("Error al cargar los mensajes.")
                setLoading(false)
              }
            }
          )
        }
      },
      (err) => {
        console.error(err)
        if (!cancelled) {
          setError("Error al cargar el chat.")
          setLoading(false)
        }
      }
    )

    return () => {
      cancelled = true
      unsubscribeMessages?.()
      unsubscribeChat()
    }
  }, [chatId, currentUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !chat) return

    setSending(true)
    setError(null)
    try {
      const text = newMessage.trim()
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.firebaseUser.uid,
        senderName:
          currentUser.name ||
          currentUser.firebaseUser.displayName ||
          currentUser.firebaseUser.email?.split("@")[0] ||
          "Usuario",
        text,
        timestamp: serverTimestamp(),
      })
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text,
        lastMessageSenderId: currentUser.firebaseUser.uid,
        lastMessageTimestamp: serverTimestamp(),
      })
      setNewMessage("")
      inputRef.current?.focus()
    } catch (err) {
      console.error(err)
      setError("Error al enviar el mensaje.")
    } finally {
      setSending(false)
    }
  }

  const handleDeleteChat = async () => {
    if (!currentUser || !chat) return
    if (!window.confirm("¿Eliminar este chat de tu bandeja?")) return
    setDeleting(true)
    try {
      await hideChatForUser(chat.id, currentUser.firebaseUser.uid)
      router.push("/mensajes")
    } catch (err) {
      console.error(err)
      setError("No se pudo eliminar el chat.")
      setDeleting(false)
    }
  }

  if (authLoading || (loading && !chat)) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#f0f2f5]">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  if ((error && !chat) || !currentUser) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-[#f0f2f5] p-4">
        <Alert variant="destructive" className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Chat</AlertTitle>
          <AlertDescription>{error || "Chat no disponible."}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/mensajes">Volver a mensajes</Link>
        </Button>
      </div>
    )
  }

  if (!chat) return null

  const uid = currentUser.firebaseUser.uid
  const otherId = uid === chat.buyerId ? chat.sellerId : chat.buyerId
  const otherName = uid === chat.buyerId ? chat.sellerName : chat.buyerName
  const otherPhoto = uid === chat.buyerId ? chat.sellerPhotoURL : chat.buyerPhotoURL
  const isStory = chat.type === "story"
  const online = isUserOnline(otherLastSeen, nowTick)
  const presenceLabel = formatLastSeen(otherLastSeen, nowTick)
  const otherLastReadMs = getOtherLastReadMs(chat.lastReadAt, otherId)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#ece5dd]">
      <header className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-[#075e54] px-2 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={() => router.push("/mensajes")}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-white/20">
            <AvatarImage src={otherPhoto || undefined} />
            <AvatarFallback className="bg-white/20 text-white">
              {otherName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          {online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#075e54] bg-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{otherName}</p>
          <p className={`truncate text-[11px] ${online ? "text-emerald-200" : "text-white/75"}`}>
            {presenceLabel}
          </p>
        </div>
        {isStory && chat.storyImageUrl && (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/30">
            <Image src={chat.storyImageUrl} alt="" fill className="object-cover" />
          </div>
        )}
        <button
          type="button"
          disabled={deleting}
          onClick={() => void handleDeleteChat()}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50"
          aria-label="Eliminar chat"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 text-white/90" />
          )}
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {isStory && (
          <p className="mx-auto mb-3 max-w-[85%] rounded-lg bg-black/5 px-3 py-2 text-center text-[11px] text-gray-600">
            Conversación iniciada desde una historia
          </p>
        )}
        {messages.map((message) => {
          const mine = message.senderId === uid
          const seen = isMessageSeen(message, uid, otherLastReadMs)
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] px-3 py-2 shadow-sm ${
                  mine
                    ? "rounded-2xl rounded-br-md bg-[#dcf8c6] text-gray-900"
                    : "rounded-2xl rounded-bl-md bg-white text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-snug">{message.text}</p>
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                  <span>
                    {message.timestamp?.toDate
                      ? message.timestamp.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "…"}
                  </span>
                  {mine &&
                    (seen ? (
                      <span className="inline-flex items-center gap-0.5 text-[#53bdeb]" title="Visto">
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="sr-only">Visto</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400" title="Enviado">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ))}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="bg-red-50 px-3 py-1.5 text-center text-xs text-red-700">{error}</p>}

      <form
        onSubmit={(e) => void handleSendMessage(e)}
        className="flex shrink-0 items-end gap-2 border-t border-black/5 bg-[#f0f2f5] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Mensaje"
          disabled={sending}
          className="min-h-11 min-w-0 flex-1 rounded-full border-0 bg-white px-4 text-[15px] text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-servido-700/30"
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#075e54] text-white disabled:opacity-40"
          aria-label="Enviar"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </div>
  )
}
