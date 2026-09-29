import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { requireLiveSeller } from "@/lib/lives-auth"
import {
  createLiveParticipantToken,
  getLiveKitUrl,
  isLiveKitConfigured,
} from "@/lib/livekit-server"
import { notifyFollowersLiveStarted } from "@/lib/lives-notify"
import { LIVE_TITLE_MAX_LEN } from "@/types/live"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    if (!isLiveKitConfigured()) {
      return NextResponse.json(
        {
          error:
            "LiveKit no está configurado. Agregá NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET.",
        },
        { status: 503 }
      )
    }

    const auth = await requireLiveSeller(request)
    if ("error" in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const title = String(body?.title || "En vivo").trim().slice(0, LIVE_TITLE_MAX_LEN) || "En vivo"

    const existing = await db
      .collection("lives")
      .where("sellerId", "==", auth.user.uid)
      .where("status", "==", "live")
      .limit(1)
      .get()

    if (!existing.empty) {
      const liveId = existing.docs[0].id
      const roomName = String(existing.docs[0].data().roomName || liveId)
      const token = await createLiveParticipantToken({
        roomName,
        identity: auth.user.uid,
        name: auth.user.name,
        canPublish: true,
      })
      return NextResponse.json({
        liveId,
        roomName,
        token,
        serverUrl: getLiveKitUrl(),
        resumed: true,
      })
    }

    const ref = db.collection("lives").doc()
    const liveId = ref.id
    const roomName = `live_${liveId}`

    await ref.set({
      sellerId: auth.user.uid,
      sellerName: auth.user.name,
      sellerPhotoURL: auth.user.photoURL,
      roomName,
      title,
      status: "live",
      viewerCount: 0,
      pinnedProduct: null,
      startedAt: FieldValue.serverTimestamp(),
      endedAt: null,
      followersNotifiedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    })

    const token = await createLiveParticipantToken({
      roomName,
      identity: auth.user.uid,
      name: auth.user.name,
      canPublish: true,
    })

    // Push a seguidores en segundo plano (no retrasa la respuesta al host).
    void notifyFollowersLiveStarted({
      sellerId: auth.user.uid,
      sellerName: auth.user.name,
      liveId,
      title,
    }).catch((err) => console.warn("[lives] notify followers", err))

    return NextResponse.json({
      liveId,
      roomName,
      token,
      serverUrl: getLiveKitUrl(),
      resumed: false,
    })
  } catch (err) {
    console.error("[lives/start]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al iniciar el vivo" },
      { status: 500 }
    )
  }
}
