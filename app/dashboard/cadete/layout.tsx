"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function CadeteDashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/login")
      } else if (currentUser.role !== "cadete") {
        router.push("/")
      }
    }
  }, [currentUser, authLoading, router])

  if (authLoading || !currentUser || currentUser.role !== "cadete") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    )
  }

  return <>{children}</>
}
