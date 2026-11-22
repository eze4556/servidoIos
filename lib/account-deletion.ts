import { FieldValue } from "firebase-admin/firestore"
import { auth as adminAuth, db as adminDb, getAdminStorageBucket } from "@/lib/firebase-admin"
import { cancelSubscriptionsForDeletion } from "@/lib/mercadopago-subscriptions"

/** Paginated, retryable cleanup. Never report success after a failed deletion. */
async function deleteQuery(query: FirebaseFirestore.Query) {
  for (;;) {
    const snap = await query.limit(200).get()
    if (snap.empty) return
    // recursiveDelete also removes subcollections (live messages, etc.).
    for (const document of snap.docs) await adminDb.recursiveDelete(document.ref)
  }
}

async function redactChats(uid: string, field: "buyerId" | "sellerId") {
  const chats = await adminDb.collection("chats").where(field, "==", uid).get()
  for (const chat of chats.docs) {
    await deleteQuery(chat.ref.collection("messages").where("senderId", "==", uid))
    const side = field === "buyerId" ? "buyer" : "seller"
    await chat.ref.update({
      [`${side}Name`]: "Usuario eliminado",
      [`${side}PhotoURL`]: FieldValue.delete(),
      lastMessage: "",
      lastMessageSenderId: FieldValue.delete(),
    })
  }
}

/**
 * Deletes profile/content and credentials. Transactional order/payment/claim
 * records are retained to fulfill outstanding obligations, as disclosed in UI.
 * A minimal tombstone prevents late payment webhooks recreating a deleted user.
 */
export async function deleteUserAccount(uid: string): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid)
  const snap = await userRef.get()
  const userData = snap.data() || {}

  // Stop actual recurring charges BEFORE erasing the subscription identifiers.
  // Failure leaves the account intact and lets the user retry.
  await cancelSubscriptionsForDeletion(uid, userData)
  await userRef.set({ deletionStatus: "processing", isActive: false }, { merge: true })

  for (const name of ["products", "vehicleListings", "propertyListings", "lives"]) {
    await deleteQuery(adminDb.collection(name).where("sellerId", "==", uid))
  }
  await deleteQuery(adminDb.collection("stories").where("authorId", "==", uid))
  for (const name of ["favorites", "follows", "notifications", "pushTokenOwners"]) {
    await deleteQuery(adminDb.collection(name).where("userId", "==", uid))
  }
  await deleteQuery(adminDb.collection("follows").where("targetUserId", "==", uid))
  for (const name of ["reviews", "questions"]) {
    await deleteQuery(adminDb.collection(name).where("userId", "==", uid))
  }
  await redactChats(uid, "buyerId")
  await redactChats(uid, "sellerId")

  // Derive restaurant ownership from the restaurant record, not an editable
  // restaurantId on a user profile. Retain a closed placeholder for old orders.
  const restaurants = await adminDb.collection("restaurants").where("ownerId", "==", uid).get()
  for (const restaurant of restaurants.docs) {
    await restaurant.ref.set({
      ownerId: uid, name: "Comercio eliminado", status: "inactive",
      isActive: false, subscriptionActive: false, deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
    })
    for (const name of ["menuItems", "menuCategories", "menuCombos", "restaurantPromotions"]) {
      await deleteQuery(adminDb.collection(name).where("restaurantId", "==", restaurant.id))
    }
    await getAdminStorageBucket().deleteFiles({ prefix: `restaurants/${restaurant.id}/` })
  }
  for (const prefix of ["users", "products", "stories", "vehicles", "properties"]) {
    await getAdminStorageBucket().deleteFiles({ prefix: `${prefix}/${uid}/` })
  }
  for (const child of await userRef.listCollections()) {
    await deleteQuery(child)
  }

  // Replace instead of merge: a denylist would leave new personal fields behind.
  await userRef.set({
    uid, role: "user", deleted: true, deletionStatus: "complete", isActive: false,
    deletedAt: FieldValue.serverTimestamp(), name: "Usuario eliminado",
    displayName: "Usuario eliminado", isSubscribed: false,
    subscription_status: "inactive", pushEnabled: false,
  })
  try {
    await adminAuth.deleteUser(uid)
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error
  }
}
