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
import { useToast } from "@/hooks/use-toast"
import { ApiService } from "@/lib/services/api"
import { auth } from "@/lib/firebase"
import { ResellerPayoutForm } from "@/components/reseller/reseller-payout-form"
import { productUrlWithRef } from "@/lib/reseller/attribution-storage"
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

  const ensureLink = async (): Promise<string | null> => {
    if (shareUrl && code) return shareUrl
    const user = auth.currentUser
    if (!user) {
      toast({ title: t("loginRequired"), variant: "destructive" })
      return null
    }
    setLoadingLink(true)
    const token = await user.getIdToken()
    const res = await fetch("/api/reseller/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId }),
    })
    const data = await res.json()
    setLoadingLink(false)
    if (!res.ok) {
      if (data.error === "missing_payout_info") {
        setStep("payout")
        return null
      }
      toast({ title: t("error"), description: data.error || t("linkError"), variant: "destructive" })
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
    return url
  }

  const openShare = async (platform: string) => {
    const url = await ensureLink()
    if (!url) return
    const text = t("shareText", { name: productName })
    let external = ""
    switch (platform) {
      case "whatsapp":
        external = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
        break
      case "facebook":
        external = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case "telegram":
        external = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        break
      default:
        return
    }
    window.open(external, "_blank", "width=600,height=520")
  }

  const copyLink = async () => {
    const url = await ensureLink()
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast({ title: t("linkCopied") })
  }

  const goStory = async () => {
    const url = await ensureLink()
    if (!url || !code) return
    onOpenChange(false)
    router.push(`/historias/nueva?product=${encodeURIComponent(productId)}&ref=${encodeURIComponent(code)}`)
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
            {loadingLink && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("generatingLink")}
              </div>
            )}
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void goStory()}>
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
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void copyLink()}>
              <Instagram className="h-4 w-4" />
              {t("copyForInstagram")}
            </Button>
            <Button type="button" variant="secondary" className="justify-start gap-2" onClick={() => void copyLink()}>
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
