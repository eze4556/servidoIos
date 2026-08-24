"use client"

import { useAuth } from "@/contexts/auth-context"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { ClaimDetail } from "@/components/claims/claim-detail"
import { getClaim } from "@/lib/claims"

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>()
  const claimId = Array.isArray(params.id) ? params.id[0] : params.id
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const [role, setRole] = useState<"buyer" | "seller" | null>(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!currentUser) {
      router.push("/login")
      return
    }
    let cancelled = false
    void (async () => {
      if (!claimId) {
        setForbidden(true)
        return
      }
      const claim = await getClaim(claimId)
      if (cancelled) return
      if (!claim) {
        setForbidden(true)
        return
      }
      const uid = currentUser.firebaseUser.uid
      if (claim.buyerId === uid) setRole("buyer")
      else if (claim.sellerId === uid || currentUser.role === "admin") setRole("seller")
      else setForbidden(true)
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, currentUser, claimId, router])

  if (authLoading || (!role && !forbidden)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (forbidden || !currentUser || !role) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">
        No tenés acceso a este reclamo.
      </div>
    )
  }

  return (
    <ClaimDetail
      claimId={claimId}
      currentUserId={currentUser.firebaseUser.uid}
      currentUserName={
        currentUser.firebaseUser.displayName || currentUser.firebaseUser.email?.split("@")[0] || "Usuario"
      }
      role={role}
    />
  )
}
