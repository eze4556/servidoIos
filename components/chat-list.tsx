"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageSquare, Frown } from "lucide-react"
import { getChatProductImage } from "@/lib/image-utils"

interface Chat {
  id: string
  productId: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  productName: string
  productImageUrl?: string
  productMedia?: any[]
  lastMessage?: string
  lastMessageTimestamp?: any
  createdAt: any
}

interface ChatListProps {
  userId: string
  role: "buyer" | "seller"
}

export function ChatList({ userId, role }: ChatListProps) {
  const t = useTranslations("chat")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    setLoading(true)
    setError(null)

    let chatsQuery
    if (role === "buyer") {
      chatsQuery = query(
        collection(db, "chats"),
        where("buyerId", "==", userId),
        orderBy("lastMessageTimestamp", "desc")
      )
    } else {
      chatsQuery = query(
        collection(db, "chats"),
        where("sellerId", "==", userId),
        orderBy("lastMessageTimestamp", "desc")
      )
    }

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const fetchedChats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Chat)
        setChats(fetchedChats)
        setLoading(false)
      },
      (err) => {
        console.error("Error listening to chats:", err)
        setError(t("loadConversationsError"))
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId, role, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return <p className="mt-4 text-center text-red-500">{error}</p>
  }

  if (chats.length === 0) {
    return (
      <div className="py-10 text-center">
        <Frown className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <p className="mb-6 text-lg text-muted-foreground">{t("emptyConversations")}</p>
        {role === "buyer" && (
          <Button asChild>
            <Link href="/">{t("exploreToChat")}</Link>
          </Button>
        )}
        {role === "seller" && <p className="text-sm text-muted-foreground">{t("sellerEmptyHint")}</p>}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {chats.map((chat) => {
        const otherParticipantName = role === "buyer" ? chat.sellerName : chat.buyerName
        const lastMessageTime = chat.lastMessageTimestamp?.toDate
          ? chat.lastMessageTimestamp.toDate().toLocaleDateString(dateLocale)
          : t("dateUnknown")

        return (
          <Link key={chat.id} href={`/chat/${chat.id}`} className="block w-full">
            <Card className="w-full transition-shadow hover:shadow-md">
              <CardContent className="flex w-full items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <Avatar className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                  <AvatarImage src={`/placeholder.svg?text=${otherParticipantName.charAt(0)}`} />
                  <AvatarFallback>{otherParticipantName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="max-w-[120px] truncate text-sm font-semibold sm:max-w-[180px] sm:text-base">
                      {otherParticipantName}
                    </h3>
                    <span className="whitespace-nowrap text-xs text-gray-500">{lastMessageTime}</span>
                  </div>
                  <p className="max-w-[180px] truncate text-xs text-gray-600 sm:max-w-full sm:text-sm">
                    {chat.lastMessage || t("noMessagesYet")}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 sm:gap-2">
                    <Image
                      src={getChatProductImage(chat.productMedia, chat.productImageUrl)}
                      alt={chat.productName}
                      width={18}
                      height={18}
                      className="rounded-sm object-cover"
                    />
                    <span className="max-w-[90px] truncate sm:max-w-[160px]">{chat.productName}</span>
                  </div>
                </div>
                <MessageSquare className="hidden h-5 w-5 flex-shrink-0 text-blue-500 xs:block" />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
