"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, UserPlus, Store, UtensilsCrossed, ArrowUpRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { listFollowing, unfollowBusiness } from "@/lib/follows"
import { profilePathForFollow, type Follow } from "@/types/follow"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function SiguiendoPage() {
  const t = useTranslations("followingPage")
  const tHeader = useTranslations("header")
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-servido-200 border-t-servido-800" />
          <p className="mt-4 text-slate-600">{t("title")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <section className="mb-8 overflow-hidden rounded-2xl bg-servido-950 shadow-[0_24px_60px_-28px_rgba(46,16,101,0.4)] ring-1 ring-servido-950/10 lg:mb-10 lg:rounded-[1.75rem]">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_0%_0%,rgba(255,212,0,0.14),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_100%_at_100%_100%,rgba(146,4,248,0.22),transparent_45%)]" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  <UserPlus className="h-3.5 w-3.5 text-servido-gold" />
                  Servido
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {t("title")}
                </h1>
                <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">{t("subtitle")}</p>
              </div>
              {follows.length > 0 && !loading && (
                <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-servido-gold ring-1 ring-white/10">
                  {follows.length === 1
                    ? t("count", { count: follows.length })
                    : t("countPlural", { count: follows.length })}
                </p>
              )}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
          </div>
        ) : follows.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-[0_16px_40px_-28px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-servido-50 text-servido-300">
              <UserPlus className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-servido-950">{t("emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600">{t("emptyBody")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-servido-gold font-semibold text-servido-950 hover:bg-[#ffe566]"
              >
                <Link href="/historias">{t("viewStories")}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-servido-200 text-servido-900 hover:bg-servido-50"
              >
                <Link href="/restaurantes">{tHeader("restaurants")}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
            {follows.map((follow) => {
              const isRestaurant = follow.targetType === "restaurant"
              return (
                <li
                  key={follow.id}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-20px_rgba(46,16,101,0.28)] ring-1 ring-servido-950/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(46,16,101,0.35)] lg:rounded-3xl"
                >
                  <Link
                    href={profilePathForFollow(follow)}
                    className="flex flex-1 flex-col p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-servido-50 to-purple-50 ring-1 ring-servido-950/5 lg:h-16 lg:w-16">
                        {follow.targetPhotoURL ? (
                          <Image
                            src={follow.targetPhotoURL}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-servido-800">
                            {isRestaurant ? (
                              <UtensilsCrossed className="h-6 w-6" />
                            ) : (
                              <Store className="h-6 w-6" />
                            )}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-base font-semibold tracking-tight text-servido-950 transition-colors group-hover:text-servido-800 lg:text-lg">
                            {follow.targetName}
                          </p>
                          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-servido-800" />
                        </div>
                        <Badge
                          variant="secondary"
                          className="mt-2 rounded-full bg-servido-50 font-medium text-servido-800 hover:bg-servido-50"
                        >
                          {isRestaurant ? t("typeRestaurant") : t("typeStore")}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                  <div className="border-t border-servido-950/5 px-5 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full border-servido-200 text-servido-900 hover:bg-servido-50"
                      disabled={removing === follow.id}
                      onClick={() => void handleUnfollow(follow)}
                    >
                      {removing === follow.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("unfollow")
                      )}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
