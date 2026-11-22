import { db, auth } from "@/lib/firebase-admin"
import type { ReportKind } from "@/lib/safety-policy"

export const SAFETY_COLLECTIONS: Record<ReportKind, string> = {
  user: "users", product: "products", story: "stories", live: "lives", chat: "chats",
  vehicle: "vehicleListings", property: "propertyListings", restaurant: "restaurants", review: "reviews", question: "questions",
}

export async function hasBlockedInteraction(a: string, b: string) {
  if (!a || !b || a === b) return false
  const [first, second] = await db.getAll(
    db.doc(`users/${a}/blockedUsers/${b}`), db.doc(`users/${b}/blockedUsers/${a}`)
  )
  return first.exists || second.exists
}

export async function resolveReportTarget(kind: ReportKind, targetId: string, reporterId: string) {
  const ref = db.collection(SAFETY_COLLECTIONS[kind]).doc(targetId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("TARGET_NOT_FOUND")
  const data = snap.data() || {}
  if (kind === "chat" && ![data.buyerId, data.sellerId].includes(reporterId)) throw new Error("FORBIDDEN")
  const authorId = kind === "user" ? targetId : kind === "chat"
    ? (data.buyerId === reporterId ? data.sellerId : data.buyerId)
    : kind === "story" ? data.authorId : kind === "restaurant" ? data.ownerId
    : ["review", "question"].includes(kind) ? data.userId : data.sellerId
  if (typeof authorId !== "string" || authorId === reporterId) throw new Error("INVALID_TARGET")
  // Preserve limited evidence for moderators, never whole user/payment records.
  const evidence = {
    title: String(data.name || data.title || data.authorName || data.senderName || "").slice(0, 200),
    text: String(data.text || data.comment || data.question || data.caption || data.description || data.lastMessage || "").slice(0, 2000),
  }
  return { ref, authorId, evidence }
}

export async function requireSafetyAdmin(uid: string) {
  const user = await db.collection("users").doc(uid).get()
  return user.data()?.role === "admin" && !user.data()?.deleted && user.data()?.isActive !== false
}

export async function removeReportedContent(kind: ReportKind, targetId: string) {
  if (kind === "user" || kind === "chat") throw new Error("Use la suspensión del usuario para este reporte")
  const ref = db.collection(SAFETY_COLLECTIONS[kind]).doc(targetId)
  if (kind === "restaurant") {
    await ref.set({ status: "inactive", isActive: false, moderationRemoved: true }, { merge: true })
  } else {
    // Removing the document also removes it from existing public catalog queries.
    await db.recursiveDelete(ref)
  }
}

export async function suspendReportedUser(uid: string) {
  if (await requireSafetyAdmin(uid)) throw new Error("No se puede suspender un administrador desde este panel")
  await auth.updateUser(uid, { disabled: true })
  await auth.revokeRefreshTokens(uid)
  await db.collection("users").doc(uid).set({ isActive: false, safetyStatus: "suspended" }, { merge: true })
  for (const name of ["products", "vehicleListings", "propertyListings", "lives", "stories"]) {
    const field = name === "stories" ? "authorId" : "sellerId"
    for (;;) {
      const rows = await db.collection(name).where(field, "==", uid).limit(100).get()
      if (rows.empty) break
      for (const row of rows.docs) await db.recursiveDelete(row.ref)
    }
  }
  const restaurants = await db.collection("restaurants").where("ownerId", "==", uid).get()
  for (const row of restaurants.docs) await row.ref.update({ status: "inactive", isActive: false })
}
