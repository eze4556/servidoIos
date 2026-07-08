"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function RestaurantDashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/login")
      } else if (currentUser.role === "cadete") {
        router.push("/dashboard/cadete")
      } else if (currentUser.role !== "seller" || currentUser.businessType !== "restaurant") {
        if (currentUser.role === "seller") {
          router.push("/dashboard/seller")
        } else {
          router.push("/")
        }
      }
    }
  }, [currentUser, authLoading, router])

  if (authLoading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  if (currentUser.role !== "seller" || currentUser.businessType !== "restaurant") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  return <>{children}</>
}
