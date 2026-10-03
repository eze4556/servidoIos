import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore"
import { db } from "@/lib/firebase-admin"
import { createNotificationAdmin } from "@/lib/notifications-server"

const FOLLOWER_PAGE = 100
const FOLLOWER_MAX = 500
const CONCURRENCY = 20

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  )
}

/** Avisa a quienes siguen al vendedor que hay un vivo (best-effort, no bloquea el start). */
export async function notifyFollowersLiveStarted(params: {
  sellerId: string
  sellerName: string
  sellerPhotoURL?: string | null
  liveId: string
  title: string
}): Promise<number> {
  const link = `/lives/${params.liveId}`
  const title = `${params.sellerName} está en vivo ahora`
  const liveTitle = params.title?.trim() || "En vivo"
  const body = `“${liveTitle}” · Tocá para mirar`

  const followerIds: string[] = []
  let lastDoc: QueryDocumentSnapshot | null = null

  while (followerIds.length < FOLLOWER_MAX) {
    let q = db
      .collection("follows")
      .where("targetUserId", "==", params.sellerId)
      .limit(FOLLOWER_PAGE)
    if (lastDoc) q = q.startAfter(lastDoc)

    const snap = await q.get()
    if (snap.empty) break

    for (const docSnap of snap.docs) {
      const userId = String(docSnap.data().userId || "")
      if (!userId || userId === params.sellerId) continue
      if (followerIds.includes(userId)) continue
      followerIds.push(userId)
      if (followerIds.length >= FOLLOWER_MAX) break
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.size < FOLLOWER_PAGE) break
  }

  if (followerIds.length === 0) {
    await db.collection("lives").doc(params.liveId).update({
      followersNotifiedAt: FieldValue.serverTimestamp(),
      followersNotifiedCount: 0,
    })
    return 0
  }

  let sent = 0
  await mapPool(followerIds, CONCURRENCY, async (userId) => {
    try {
      await createNotificationAdmin({
        userId,
        type: "live_started",
        title,
        body,
        link,
        dedupeKey: `live_started_${params.liveId}_${userId}`,
        meta: {
          liveId: params.liveId,
          sellerId: params.sellerId,
          sellerName: params.sellerName,
          sellerPhotoURL: params.sellerPhotoURL || null,
          liveTitle,
          i18nKey: "live.started",
          i18nParams: {
            sellerName: params.sellerName,
            liveTitle,
          },
        },
      })
      sent += 1
    } catch (err) {
      console.warn("[lives] notify follower failed", userId, err)
    }
  })

  await db.collection("lives").doc(params.liveId).update({
    followersNotifiedAt: FieldValue.serverTimestamp(),
    followersNotifiedCount: sent,
  })

  return sent
}
