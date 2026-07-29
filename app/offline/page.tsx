"use client"

import { WifiOff, RefreshCw, Home } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function OfflinePage() {
  const t = useTranslations("offline")
  const router = useRouter()

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Icono offline */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-12 h-12 text-purple-600" />
          </div>
        </div>

        {/* Título y descripción */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {t("title")}
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          {t("description")}
        </p>

        {/* Botones de acción */}
        <div className="space-y-3">
          <Button 
            onClick={handleRefresh}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {t("retry")}
          </Button>
          
          <Button 
            onClick={handleGoHome}
            variant="outline"
            className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            {t("home")}
          </Button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">{t("tip")}</p>
        </div>
      </div>
    </div>
  )
}
