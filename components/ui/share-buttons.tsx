"use client"

import { Button } from "@/components/ui/button"
import { Facebook, MessageCircle, Twitter } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

interface ShareButtonsProps {
  productName: string
  productUrl: string
  productPrice?: number
  productImage?: string
}

export function ShareButtons({ productName, productUrl, productPrice }: ShareButtonsProps) {
  const t = useTranslations("share")
  const locale = useLocale()
  const currencyLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"

  const shareText = productPrice
    ? t("shareTextWithPrice", {
        name: productName,
        price: productPrice.toLocaleString(currencyLocale, { style: "currency", currency: "ARS" }),
      })
    : t("shareText", { name: productName })

  const handleShare = (platform: string) => {
    let shareUrl = ""

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(shareText)}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`
        break
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`
        break
      default:
        return
    }

    window.open(shareUrl, "_blank", "width=600,height=400")
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{t("label")}</span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("whatsapp")}
        className="border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">WhatsApp</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("facebook")}
        className="border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
      >
        <Facebook className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Facebook</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("twitter")}
        className="border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
      >
        <Twitter className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Twitter</span>
      </Button>
    </div>
  )
}
