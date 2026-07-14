"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UserMinus, UserPlus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { followBusiness, isFollowing, unfollowBusiness } from "@/lib/follows"
import type { FollowTargetType } from "@/types/follow"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  targetUserId: string
  targetType: FollowTargetType
  targetName: string
  targetPhotoURL?: string | null
  restaurantId?: string | null
  /** Estilo para el viewer de historias (borde blanco) */
  variant?: "default" | "story"
  className?: string
  onChanged?: (following: boolean) => void
}

export function FollowButton({
  targetUserId,
  targetType,
  targetName,
  targetPhotoURL,
  restaurantId,
  variant = "default",
  className,
  onChanged,
}: FollowButtonProps) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const uid = currentUser?.firebaseUser.uid
  const isSelf = Boolean(uid && uid === targetUserId)

  useEffect(() => {
    if (!uid || isSelf) {
      setFollowing(false)
      setLoading(false)
      return
    }
    let cancelled = false
    void isFollowing(uid, targetUserId).then((v) => {
      if (!cancelled) {
        setFollowing(v)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [uid, targetUserId, isSelf])

  if (isSelf) return null

  const toggle = async () => {
    if (!uid) {
      router.push("/login")
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (following) {
        await unfollowBusiness(uid, targetUserId)
        setFollowing(false)
        onChanged?.(false)
      } else {
        await followBusiness({
          userId: uid,
          targetUserId,
          targetType,
          targetName,
          targetPhotoURL,
          restaurantId,
        })
        setFollowing(true)
        onChanged?.(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  if (variant === "story") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void toggle()
        }}
        disabled={busy || loading}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60",
          following
            ? "bg-white/20 text-white ring-1 ring-white/40"
            : "bg-white text-servido-900",
          className
        )}
      >
        {busy || loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : following ? (
          "Siguiendo"
        ) : (
          "Seguir"
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy || loading}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-60",
        following
          ? "bg-gray-100 text-gray-800 ring-1 ring-gray-200 hover:bg-gray-200"
          : "bg-servido-800 text-white hover:bg-servido-900",
        className
      )}
    >
      {busy || loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="h-4 w-4" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Seguir
        </>
      )}
    </button>
  )
}
