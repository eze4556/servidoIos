"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, X } from "lucide-react"
import { useTranslations } from "next-intl"

interface SubscriptionNotificationProps {
  status: "success" | "failure"
  onClose: () => void
}

export function SubscriptionNotification({ status, onClose }: SubscriptionNotificationProps) {
  const t = useTranslations("sellerDashboard.subscriptionNotification")
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 8000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  const isSuccess = status === "success"

  return (
    <div className="fixed right-4 top-4 z-50 duration-300 animate-in slide-in-from-right-2">
      <Card
        className={`w-96 border-0 shadow-2xl ${isSuccess ? "bg-gradient-to-r from-green-50 to-green-100" : "bg-gradient-to-r from-red-50 to-red-100"}`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${isSuccess ? "bg-green-500" : "bg-red-500"}`}
              >
                {isSuccess ? <CheckCircle className="h-6 w-6 text-white" /> : <XCircle className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isSuccess ? "text-green-800" : "text-red-800"}`}>
                  {isSuccess ? t("successTitle") : t("failureTitle")}
                </h3>
                <p className={`mt-1 text-sm ${isSuccess ? "text-green-600" : "text-red-600"}`}>
                  {isSuccess ? t("successBody") : t("failureBody")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("closeAria")}
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isSuccess && (
            <div className="mt-4 border-t border-green-200 pt-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>{t("successHint")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
