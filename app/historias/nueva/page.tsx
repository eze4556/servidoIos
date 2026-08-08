"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import { StoryComposer } from "@/components/stories/story-composer"

function NuevaHistoriaContent() {
  const t = useTranslations("storyNewPage")
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialProductId = searchParams.get("product")
  const initialRefCode = searchParams.get("ref")
  const initialAuto = searchParams.get("auto") === "1"
  const isResellerStory = Boolean(initialProductId && initialRefCode)

  useEffect(() => {
    if (authLoading) return
    if (!currentUser) {
      router.replace("/login")
      return
    }
    if (currentUser.role !== "seller" && !isResellerStory) {
      router.replace("/historias")
    }
  }, [currentUser, authLoading, router, isResellerStory])

  if (authLoading || !currentUser || (currentUser.role !== "seller" && !isResellerStory)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-servido-700" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Link
            href="/historias"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-xs text-gray-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <StoryComposer
          initialProductId={initialProductId}
          initialRefCode={initialRefCode}
          initialAuto={initialAuto}
        />
      </div>
    </div>
  )
}

export default function NuevaHistoriaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-servido-700" />
        </div>
      }
    >
      <NuevaHistoriaContent />
    </Suspense>
  )
}
