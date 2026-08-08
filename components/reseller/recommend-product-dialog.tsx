"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase"
import { ResellerPayoutForm } from "@/components/reseller/reseller-payout-form"
import { productUrlWithRef } from "@/lib/reseller/attribution-storage"
import { copyTextToClipboard } from "@/lib/copy-to-clipboard"
import {
  Copy,
  Facebook,
  Instagram,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react"

type RecommendProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
}

type ResellerLinkResult = { url: string; code: string }

export function RecommendProductDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: RecommendProductDialogProps) {
  const t = useTranslations("resellerProgram")
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<"payout" | "share">("share")
  const [loadingLink, setLoadingLink] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)

  const ensureLink = async (): Promise<ResellerLinkResult | null> => {
    if (shareUrl && code) return { url: shareUrl, code }
    const user = auth.currentUser
    if (!user) {
      toast({ title: t("loginRequired"), variant: "destructive" })
      return null
    }
    setLoadingLink(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/reseller/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      })
      const data = (await res.json()) as { code?: string; error?: string }
      if (!res.ok) {
        if (data.error === "missing_payout_info") {
          setStep("payout")
          return null
        }
        toast({
          title: t("error"),
          description: data.error || t("linkError"),
          variant: "destructive",
        })
        return null
      }
      if (!data.code) {
        toast({ title: t("error"), description: t("linkError"), variant: "destructive" })
        return null
      }
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const url = productUrlWithRef(origin, productId, data.code)
      setCode(data.code)
      setShareUrl(url)
      void fetch("/api/reseller/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.code }),
      })
      return { url, code: data.code }
    } catch {
      toast({ title: t("error"), description: t("linkError"), variant: "destructive" })
      return null
    } finally {
      setLoadingLink(false)
    }
  }

  const openShare = async (platform: string) => {
    const link = await ensureLink()
    if (!link) return
    const text = t("shareText", { name: productName })
    let external = ""
    switch (platform) {
      case "whatsapp":
        external = `https://wa.me/?text=${encodeURIComponent(`${text} ${link.url}`)}`
        break
      case "facebook":
        external = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.url)}`
        break
      case "telegram":
        external = `https://t.me/share/url?url=${encodeURIComponent(link.url)}&text=${encodeURIComponent(text)}`
        break
      default:
        return
    }
    window.open(external, "_blank", "width=600,height=520")
  }

  const copyShareUrl = async () => {
    const link = await ensureLink()
    if (!link) return
    const ok = await copyTextToClipboard(link.url)
    if (ok) {
      toast({ title: t("linkCopied") })
    } else {
      toast({ title: t("error"), description: t("copyFailed"), variant: "destructive" })
    }
  }

  const copyForInstagram = async () => {
    const link = await ensureLink()
    if (!link) return
    const text = `${t("shareText", { name: productName })}\n${link.url}`
    const ok = await copyTextToClipboard(text)
    if (ok) {
      toast({ title: t("instagramCopied") })
    } else {
      toast({ title: t("error"), description: t("copyFailed"), variant: "destructive" })
    }
  }

  const goStory = async () => {
    setStoryLoading(true)
    const link = await ensureLink()
    setStoryLoading(false)
    if (!link) return
    onOpenChange(false)
    const params = new URLSearchParams({
      product: productId,
      ref: link.code,
      auto: "1",
    })
    router.push(`/historias/nueva?${params.toString()}`)
  }

  const handlePayoutSaved = () => {
    setStep("share")
    void ensureLink()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("recommendTitle")}</DialogTitle>
          <DialogDescription>{t("recommendDesc", { name: productName })}</DialogDescription>
        </DialogHeader>

        {step === "payout" ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-purple-900">{t("payoutRequired")}</p>
            <ResellerPayoutForm compact onSaved={handlePayoutSaved} />
          </div>
        ) : (
          <div className="grid gap-2">
            {(loadingLink || storyLoading) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("generatingLink")}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              disabled={loadingLink || storyLoading}
              onClick={() => void goStory()}
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              {t("shareStory")}
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void openShare("whatsapp")}>
              <MessageCircle className="h-4 w-4 text-green-600" />
              WhatsApp
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void openShare("telegram")}>
              <Send className="h-4 w-4 text-sky-600" />
              Telegram
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void openShare("facebook")}>
              <Facebook className="h-4 w-4 text-blue-600" />
              Facebook
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void copyForInstagram()}>
              <Instagram className="h-4 w-4" />
              {t("copyForInstagram")}
            </Button>
            <Button type="button" variant="secondary" className="justify-start gap-2" onClick={() => void copyShareUrl()}>
              <Copy className="h-4 w-4" />
              {t("copyLink")}
            </Button>
            <Button type="button" variant="link" asChild className="h-auto p-0 text-sm">
              <Link href="/dashboard/buyer?tab=reseller">{t("goResellerPanel")}</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
