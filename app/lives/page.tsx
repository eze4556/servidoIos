"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Radio } from "lucide-react"
import { subscribeActiveLives } from "@/lib/lives"
import type { LiveSession } from "@/types/live"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LiveViewer } from "@/components/lives/live-viewer"
import { LiveListCard } from "@/components/lives/live-list-card"
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
            En vivo ahora
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
        <ul className="space-y-4">
          {lives.map((live) => (
            <li key={live.id}>
              <LiveListCard live={live} />
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
