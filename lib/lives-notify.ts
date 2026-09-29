import { FieldValue } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"

const FOLLOWER_NOTIFY_BATCH = 80

/** Avisa a quienes siguen al vendedor que hay un vivo (best-effort, no bloquea el start). */
export async function notifyFollowersLiveStarted(params: {
  sellerId: string
  sellerName: string
  liveId: string
  title: string
}): Promise<number> {
  const follows = await db
    .collection("follows")
    .where("targetUserId", "==", params.sellerId)
    .limit(FOLLOWER_NOTIFY_BATCH)
    .get()

  if (follows.empty) return 0

  let sent = 0
  const link = `/lives/${params.liveId}`
  const title = `${params.sellerName} está en vivo`
  const body = params.title?.trim() || "Entrá a ver la transmisión"

  await Promise.all(
    follows.docs.map(async (docSnap) => {
      const userId = String(docSnap.data().userId || "")
      if (!userId || userId === params.sellerId) return
      try {
        await createNotificationAdmin({
          userId,
          type: "live_started",
          title,
          body,
          link,
          dedupeKey: `live_started_${params.liveId}_${userId}`,
          meta: { liveId: params.liveId, sellerId: params.sellerId },
        })
        sent += 1
      } catch (err) {
        console.warn("[lives] notify follower failed", userId, err)
      }
    })
  )

  await db.collection("lives").doc(params.liveId).update({
    followersNotifiedAt: FieldValue.serverTimestamp(),
    followersNotifiedCount: sent,
  })

  return sent
}
