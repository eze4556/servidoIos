"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus, Frown, Store, UtensilsCrossed } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { listFollowing, unfollowBusiness } from "@/lib/follows"
import { profilePathForFollow, type Follow } from "@/types/follow"
import { Button } from "@/components/ui/button"

export default function SiguiendoPage() {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const [follows, setFollows] = useState<Follow[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !currentUser) router.push("/login")
  }, [authLoading, currentUser, router])

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    void listFollowing(currentUser.firebaseUser.uid).then((list) => {
      if (!cancelled) {
        setFollows(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [currentUser])

  const handleUnfollow = async (follow: Follow) => {
    if (!currentUser) return
    setRemoving(follow.id)
    try {
      await unfollowBusiness(currentUser.firebaseUser.uid, follow.targetUserId)
      setFollows((prev) => prev.filter((f) => f.id !== follow.id))
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving(null)
    }
  }

  if (authLoading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      <div className="border-b border-gray-100 bg-white/90">
        <div className="container mx-auto flex items-center gap-3 px-4 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-servido-800 text-white">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Siguiendo</h1>
            <p className="text-xs text-gray-500">Tiendas y restaurantes que seguís</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-lg px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
          </div>
        ) : follows.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-gray-100">
            <Frown className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-800">Todavía no seguís a nadie</p>
            <p className="mt-1 text-sm text-gray-500">
              Seguí comercios desde sus historias o su perfil para verlos primero.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild className="rounded-full bg-servido-800">
                <Link href="/historias">Ver historias</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/restaurantes">Restaurantes</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {follows.map((follow) => (
              <li
                key={follow.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-gray-100"
              >
                <Link
                  href={profilePathForFollow(follow)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {follow.targetPhotoURL ? (
                      <Image src={follow.targetPhotoURL} alt="" fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-servido-800">
                        {follow.targetType === "restaurant" ? (
                          <UtensilsCrossed className="h-5 w-5" />
                        ) : (
                          <Store className="h-5 w-5" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{follow.targetName}</p>
                    <p className="text-xs text-gray-500">
                      {follow.targetType === "restaurant" ? "Restaurante" : "Tienda"}
                    </p>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={removing === follow.id}
                  onClick={() => void handleUnfollow(follow)}
                >
                  {removing === follow.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Dejar"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
