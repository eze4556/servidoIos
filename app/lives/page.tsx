"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Radio } from "lucide-react"
import { subscribeActiveLives } from "@/lib/lives"
import type { LiveSession } from "@/types/live"
import { liveHref } from "@/lib/routes"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LiveViewer } from "@/components/lives/live-viewer"
import { useSearchParams } from "next/navigation"

function LivesList() {
  const { currentUser } = useAuth()
  const [lives, setLives] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const canHost =
    currentUser?.role === "seller" && currentUser.businessType !== "restaurant"

  useEffect(() => {
    return subscribeActiveLives(
      (next) => {
        setLives(next)
        setLoading(false)
      },
      () => setLoading(false)
    )
  }, [])

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-servido-950">
            <Radio className="h-6 w-6 text-red-600" />
            En vivo
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Mirás, chateás y comprás sin salir de Servido.
          </p>
        </div>
        {canHost ? (
          <Button asChild className="shrink-0 rounded-full bg-red-600 hover:bg-red-700">
            <Link href="/dashboard/seller/live">Transmitir</Link>
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
        </div>
      ) : lives.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-servido-950/5">
          <p className="text-sm text-slate-600">No hay transmisiones activas ahora.</p>
          {canHost ? (
            <Button asChild className="mt-4 rounded-full bg-red-600 hover:bg-red-700">
              <Link href="/dashboard/seller/live">Sé el primero en transmitir</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {lives.map((live) => (
            <li key={live.id}>
              <Link
                href={liveHref(live.id)}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-servido-950/5 transition hover:ring-servido-800/20"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-red-500">
                  {live.sellerPhotoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={live.sellerPhotoURL}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-servido-900 text-lg font-bold text-white">
                      {live.sellerName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      Live
                    </span>
                    <span className="truncate font-semibold text-servido-950">{live.title}</span>
                  </div>
                  <p className="truncate text-sm text-slate-600">{live.sellerName}</p>
                  <p className="mt-0.5 text-xs font-medium text-red-600">
                    {live.viewerCount === 1
                      ? "1 mirando"
                      : `${live.viewerCount} mirando`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LivesPageInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  if (id) return <LiveViewer liveId={id} />
  return <LivesList />
}

export default function LivesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-servido-800" />
        </div>
      }
    >
      <LivesPageInner />
    </Suspense>
  )
}
