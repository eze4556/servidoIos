"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
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
import { isServidoOfficialChat, SERVIDO_OFFICIAL_LOGO_PATH } from "@/lib/servido-official"
import { ServidoOfficialLabel } from "@/components/chat/servido-official-label"
import { ServidoOfficialAvatar } from "@/components/chat/servido-official-avatar"
import {
  formatLastSeenLocalized,
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
import { ArrowLeft, Check, CheckCheck, Info, Loader2, Package, Send, Trash2 } from "lucide-react"
import { validateChatMessageText } from "@/lib/chat-content-guard"
import { fetchProductListingForChat } from "@/lib/chat-listing-share"
import { ChatListingMessageCard } from "@/components/chat/chat-listing-message-card"
import { ChatShareProductSheet } from "@/components/chat/chat-share-product-sheet"

interface Chat {
  id: string
  type?: "product" | "story" | "delivery" | "servido"
  productId?: string
  foodOrderId?: string
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
  broadcastTitle?: string | null
  link?: string | null
  source?: string
  messageType?: "text" | "listing"
  listingKind?: "product" | "story"
  listingId?: string
  listingTitle?: string
  listingImageUrl?: string | null
  listingPrice?: number | null
}

export default function ChatPage() {
  const t = useTranslations("chat")
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const { currentUser, authLoading } = useAuth()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sharingListing, setSharingListing] = useState(false)
  const [sharingProductId, setSharingProductId] = useState<string | null>(null)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
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

  // Other user last seen (skip Servido system account)
  useEffect(() => {
    if (!chat || !currentUser) return
    if (isServidoOfficialChat(chat)) {
      setOtherLastSeen(null)
      return
    }
    const uid = currentUser.firebaseUser.uid
    const otherId = uid === chat.buyerId ? chat.sellerId : chat.buyerId
    return subscribeUserPresence(otherId, setOtherLastSeen)
  }, [chat, currentUser])

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
          setError(t("notFound"))
          setLoading(false)
          return
        }

        const chatData = { id: chatSnap.id, ...chatSnap.data() } as Chat
        const uid = currentUser.firebaseUser.uid

        if (uid !== chatData.buyerId && uid !== chatData.sellerId) {
          setError(t("noPermission"))
          setLoading(false)
          return
        }

        if (Array.isArray(chatData.deletedBy) && chatData.deletedBy.includes(uid)) {
          setError(t("deleted"))
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
          const servidoChat = isServidoOfficialChat(chatData)
          if (servidoChat) {
            setChat((prev) =>
              prev
                ? {
                    ...prev,
                    sellerPhotoURL: SERVIDO_OFFICIAL_LOGO_PATH,
                  }
                : prev
            )
          } else {
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
                setError(t("loadMessagesError"))
                setLoading(false)
              }
            }
          )
        }
      },
      (err) => {
        console.error(err)
        if (!cancelled) {
          setError(t("loadChatError"))
          setLoading(false)
        }
      }
    )

    return () => {
      cancelled = true
      unsubscribeMessages?.()
      unsubscribeChat()
    }
  }, [chatId, currentUser, t])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !chat) return

    const text = newMessage.trim()
    const guard = validateChatMessageText(text)
    if (!guard.allowed) {
      setError(
        guard.reason === "email"
          ? t("blockedEmail")
          : guard.reason === "phone"
            ? t("blockedPhone")
            : guard.reason === "link"
              ? t("blockedLink")
              : t("blockedContact")
      )
      return
    }

    setSending(true)
    setError(null)
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.firebaseUser.uid,
        senderName:
          currentUser.name ||
          currentUser.firebaseUser.displayName ||
          currentUser.firebaseUser.email?.split("@")[0] ||
          t("defaultUser"),
        text,
        messageType: "text",
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
      setError(t("sendError"))
    } finally {
      setSending(false)
    }
  }

  const sendListingMessage = async (productId: string) => {
    if (!currentUser) return
    setSharingProductId(productId)
    setSharingListing(true)
    setError(null)
    try {
      const listing = await fetchProductListingForChat(productId)
      if (!listing) {
        setError(t("shareListingError"))
        return
      }
      const preview = t("sharedListingLabel")
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.firebaseUser.uid,
        senderName:
          currentUser.name ||
          currentUser.firebaseUser.displayName ||
          currentUser.firebaseUser.email?.split("@")[0] ||
          t("defaultUser"),
        text: preview,
        messageType: "listing",
        listingKind: "product",
        listingId: listing.listingId,
        listingTitle: listing.listingTitle,
        listingImageUrl: listing.listingImageUrl,
        listingPrice: listing.listingPrice,
        timestamp: serverTimestamp(),
      })
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: preview,
        lastMessageSenderId: currentUser.firebaseUser.uid,
        lastMessageTimestamp: serverTimestamp(),
      })
      setShareSheetOpen(false)
    } catch (err) {
      console.error(err)
      setError(t("shareListingError"))
    } finally {
      setSharingListing(false)
      setSharingProductId(null)
    }
  }

  const handleShareListing = async () => {
    if (!currentUser || !chat) return
    if (chat.productId) {
      await sendListingMessage(chat.productId)
      return
    }
    setShareSheetOpen(true)
  }

  const handleDeleteChat = async () => {
    if (!currentUser || !chat) return
    if (!window.confirm(t("deleteConfirm"))) return
    setDeleting(true)
    try {
      await hideChatForUser(chat.id, currentUser.firebaseUser.uid)
      router.push("/mensajes")
    } catch (err) {
      console.error(err)
      setError(t("deleteError"))
      setDeleting(false)
    }
  }

  if (authLoading || (loading && !chat)) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-[#f0f2f5] lg:h-[100dvh]">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  if ((error && !chat) || !currentUser) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-[#f0f2f5] p-4 lg:h-[100dvh]">
        <Alert variant="destructive" className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("alertTitle")}</AlertTitle>
          <AlertDescription>{error || t("unavailable")}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4 rounded-full">
          <Link href="/mensajes">{t("backToMessages")}</Link>
        </Button>
      </div>
    )
  }

  if (!chat) return null

  const uid = currentUser.firebaseUser.uid
  const isStory = chat.type === "story"
  const isDelivery = chat.type === "delivery"
  const isServido = isServidoOfficialChat(chat)
  const otherId = uid === chat.buyerId ? chat.sellerId : chat.buyerId
  const otherName = uid === chat.buyerId ? chat.sellerName : chat.buyerName
  const otherPhoto = isServido
    ? chat.sellerPhotoURL || SERVIDO_OFFICIAL_LOGO_PATH
    : uid === chat.buyerId
      ? chat.sellerPhotoURL
      : chat.buyerPhotoURL
  const canShareProducts = !isStory && !isDelivery && !isServido && Boolean(chat.sellerId)
  const online = isUserOnline(otherLastSeen, nowTick)
  const presenceLabel = formatLastSeenLocalized(otherLastSeen, t, locale, nowTick)
  const otherLastReadMs = getOtherLastReadMs(chat.lastReadAt, otherId)

  return (
    <div className="fixed inset-x-0 top-0 bottom-[4.75rem] z-40 flex flex-col bg-[#ece5dd] lg:inset-0">
      <header className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-[#075e54] px-2 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={() => router.push("/mensajes")}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label={t("backAria")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          {isServido ? (
            <ServidoOfficialAvatar size={40} className="ring-2 ring-white/30" />
          ) : (
          <Avatar className="h-10 w-10 ring-2 ring-white/20">
            <AvatarImage src={otherPhoto || undefined} />
            <AvatarFallback className="bg-white/20 text-white">
              {otherName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          )}
          {online && !isServido && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#075e54] bg-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {isServido ? (
            <ServidoOfficialLabel inverted nameClassName="text-[15px] text-white" iconClassName="h-4 w-4" />
          ) : (
            <p className="truncate text-[15px] font-semibold leading-tight">{otherName}</p>
          )}
          <p className={`truncate text-[11px] ${online && !isServido ? "text-emerald-200" : "text-white/75"}`}>
            {isServido ? t("servidoOfficialSubtitle") : presenceLabel}
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
          aria-label={t("deleteChatAria")}
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
            {t("storyBanner")}
          </p>
        )}
        {isDelivery && (
          <p className="mx-auto mb-3 max-w-[85%] rounded-lg bg-sky-900/10 px-3 py-2 text-center text-[11px] text-sky-900">
            {t("deliveryBanner")}
          </p>
        )}
        {isServido && (
          <p className="mx-auto mb-3 max-w-[95%] rounded-lg bg-servido-800/10 px-3 py-2 text-center text-[11px] leading-snug text-servido-900">
            {t("servidoChannelBanner")}
          </p>
        )}
        {!isServido && (
        <p className="mx-auto mb-3 max-w-[95%] rounded-lg bg-servido-800/5 px-3 py-2 text-center text-[11px] leading-snug text-gray-700">
          {t("securityNotice")}
        </p>
        )}
        {messages.map((message) => {
          const mine = message.senderId === uid
          const seen = isMessageSeen(message, uid, otherLastReadMs)
          const isListing = message.messageType === "listing" && message.listingId
          const listingHref =
            message.listingKind === "product"
              ? `/product/${message.listingId}`
              : message.listingKind === "story"
                ? `/historias`
                : null
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] px-3 py-2 shadow-sm ${
                  mine
                    ? "rounded-2xl rounded-br-md bg-[#dcf8c6] text-gray-900"
                    : "rounded-2xl rounded-bl-md bg-white text-gray-900"
                }`}
              >
                {isListing && message.listingKind === "product" && message.listingId ? (
                  <ChatListingMessageCard
                    title={message.listingTitle || message.text}
                    imageUrl={message.listingImageUrl}
                    price={message.listingPrice}
                    productId={message.listingId}
                    labels={{
                      badge: t("sharedListingLabel"),
                      viewProduct: t("viewProduct"),
                      buyNow: t("buyNow"),
                    }}
                  />
                ) : isListing && listingHref ? (
                  <Link href={listingHref} className="block">
                    {message.listingImageUrl && (
                      <div className="relative mb-2 h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={message.listingImageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <p className="text-xs font-medium uppercase tracking-wide text-servido-800">
                      {t("sharedListingLabel")}
                    </p>
                    <p className="text-[15px] font-semibold leading-snug">{message.listingTitle || message.text}</p>
                    <p className="mt-1 text-xs font-medium text-servido-700">{t("viewListing")} →</p>
                  </Link>
                ) : (
                  <>
                    {message.broadcastTitle && (
                      <p className="text-[15px] font-bold leading-snug text-servido-900">{message.broadcastTitle}</p>
                    )}
                    <p className="whitespace-pre-wrap text-[15px] leading-snug">{message.text}</p>
                    {message.link && typeof message.link === "string" && message.link.trim() && (
                      <Button asChild size="sm" className="mt-2 h-8 rounded-full bg-servido-800 text-xs hover:bg-servido-900">
                        <Link
                          href={
                            message.link.startsWith("http") || message.link.startsWith("/")
                              ? message.link
                              : `/${message.link.replace(/^\//, "")}`
                          }
                        >
                          {t("servidoBroadcastOpenLink")}
                        </Link>
                      </Button>
                    )}
                  </>
                )}
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
                      <span className="inline-flex items-center gap-0.5 text-[#53bdeb]" title={t("seen")}>
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="sr-only">{t("seen")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400" title={t("sent")}>
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

      {!isServido && (
      <form
        onSubmit={(e) => void handleSendMessage(e)}
        className="flex shrink-0 items-end gap-2 border-t border-black/5 bg-[#f0f2f5] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      >
        {canShareProducts && (
          <button
            type="button"
            disabled={sharingListing || sending}
            onClick={() => void handleShareListing()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-servido-800 shadow-sm disabled:opacity-40"
            aria-label={t("shareListingAria")}
            title={t("shareListingAria")}
          >
            {sharingListing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Package className="h-5 w-5" />
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          disabled={sending}
          className="min-h-11 min-w-0 flex-1 rounded-full border-0 bg-white px-4 text-[15px] text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-servido-700/30"
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#075e54] text-white disabled:opacity-40"
          aria-label={t("sendAria")}
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
      )}
      {chat.sellerId && !isServido && (
        <ChatShareProductSheet
          open={shareSheetOpen}
          onOpenChange={setShareSheetOpen}
          sellerId={chat.sellerId}
          sharingId={sharingProductId}
          onShare={(productId) => sendListingMessage(productId)}
        />
      )}
    </div>
  )
}
