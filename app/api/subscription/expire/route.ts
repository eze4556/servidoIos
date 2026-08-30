import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getSubscriptionSnapshot } from "@/lib/subscription-utils"
import type { QueryDocumentSnapshot } from "firebase-admin/firestore"
import { createNotificationAdmin } from "@/lib/notifications-server"

export const runtime = "nodejs"

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true

  const authorizationHeader = request.headers.get("authorization")
  return authorizationHeader === `Bearer ${cronSecret}`
}

function isMarkedActive(userData: any) {
  return (
    userData?.subscription_status === "active" ||
    userData?.subscription?.status === "active" ||
    userData?.isSubscribed === true
  )
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [subscriptionStatusSnap, isSubscribedSnap, nestedSubscriptionStatusSnap] = await Promise.all([
      db.collection("users").where("subscription_status", "==", "active").get(),
      db.collection("users").where("isSubscribed", "==", true).get(),
      db.collection("users").where("subscription.status", "==", "active").get(),
    ])

    const candidateDocs = new Map<string, QueryDocumentSnapshot>()
    subscriptionStatusSnap.forEach((doc) => candidateDocs.set(doc.id, doc))
    isSubscribedSnap.forEach((doc) => candidateDocs.set(doc.id, doc))
    nestedSubscriptionStatusSnap.forEach((doc) => candidateDocs.set(doc.id, doc))

    const now = new Date()
    const expiredDocs = Array.from(candidateDocs.values()).filter((docSnap) => {
      const userData = docSnap.data()
      if (!isMarkedActive(userData)) return false

      const subscriptionSnapshot = getSubscriptionSnapshot(userData, now)
      return Boolean(subscriptionSnapshot.endsAt && subscriptionSnapshot.endsAt.getTime() <= now.getTime())
    })

    const updateResults = await Promise.allSettled(
      expiredDocs.map(async (docSnap) => {
        const userData = docSnap.data() as { restaurantId?: string; businessType?: string }
        await docSnap.ref.update({
          subscription_status: "inactive",
          isSubscribed: false,
          "subscription.status": "inactive",
          updatedAt: now,
        })
        if (userData.businessType === "restaurant" && userData.restaurantId) {
          await db.collection("restaurants").doc(userData.restaurantId).set(
            {
              subscriptionActive: false,
              updatedAt: now,
            },
            { merge: true }
          )
        }
        await createNotificationAdmin({
          userId: docSnap.id,
          type: "subscription",
          title: "Tu suscripción venció",
          body: "Renovala para seguir publicando y recibiendo pedidos.",
          link:
            userData.businessType === "restaurant"
              ? "/dashboard/restaurant"
              : "/dashboard/seller",
          dedupeKey: `subscription_expired_${docSnap.id}_${now.toISOString().slice(0, 10)}`,
          meta: { expiredAt: now.toISOString() },
        })
      }),
    )

    const updatedCount = updateResults.filter((result) => result.status === "fulfilled").length
    const failedCount = updateResults.length - updatedCount

    return NextResponse.json({
      success: true,
      scannedCount: candidateDocs.size,
      expiredCount: expiredDocs.length,
      updatedCount,
      failedCount,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("Error expiring subscriptions:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error procesando expiraciones de suscripcion",
      },
      { status: 500 },
    )
  }
}
