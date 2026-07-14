import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signOut,
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { sendWelcomeEmail } from "@/lib/email-service"
import type { DeliveryMode } from "@/types/restaurant"

export interface RestaurantSignupInput {
  name: string
  email: string
  phone: string
  password: string
  restaurantName: string
  address: string
  deliveryMode: DeliveryMode
}

export interface CadeteSignupInput {
  name: string
  email: string
  phone: string
  password: string
  zone: string
  vehicle: string
  documentId: string
}

async function rollbackAuthUser() {
  try {
    await deleteUser(auth.currentUser!)
  } catch (deleteError) {
    console.error("Error deleting partially created auth user:", deleteError)
    await signOut(auth).catch(() => {})
  }
}

export async function signupRestaurant(input: RestaurantSignupInput) {
  const normalizedEmail = input.email.trim().toLowerCase()
  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, input.password)
  const user = userCredential.user
  const restaurantId = user.uid

  await updateProfile(user, { displayName: input.name.trim() })

  const userData = {
    uid: user.uid,
    email: user.email,
    phone: input.phone.trim(),
    name: input.name.trim(),
    role: "seller",
    businessType: "restaurant",
    restaurantId,
    isActive: true,
    createdAt: serverTimestamp(),
    termsAccepted: true,
    termsAcceptedAt: serverTimestamp(),
    subscription_status: "inactive",
    isSubscribed: false,
    productUploadLimit: 0,
  }

  const restaurantData = {
    id: restaurantId,
    ownerId: user.uid,
    name: input.restaurantName.trim(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    deliveryMode: input.deliveryMode,
    status: "pending",
    paymentMethods: ["cash", "transfer"],
    transferInfo: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  try {
    await setDoc(doc(db, "users", user.uid), userData)
    await setDoc(doc(db, "restaurants", restaurantId), restaurantData)
  } catch (firestoreError) {
    await rollbackAuthUser()
    throw firestoreError
  }

  await sendWelcomeEmail({
    user_name: input.name.trim(),
    user_email: normalizedEmail,
    account_type: "restaurant",
  }).catch(() => {})

  return { userId: user.uid, restaurantId }
}

export async function signupCadete(input: CadeteSignupInput) {
  const normalizedEmail = input.email.trim().toLowerCase()
  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, input.password)
  const user = userCredential.user

  await updateProfile(user, { displayName: input.name.trim() })

  const userData = {
    uid: user.uid,
    email: user.email,
    phone: input.phone.trim(),
    name: input.name.trim(),
    role: "cadete",
    status: "pending_approval",
    zone: input.zone.trim(),
    vehicle: input.vehicle.trim(),
    documentId: input.documentId.trim(),
    isActive: false,
    createdAt: serverTimestamp(),
    termsAccepted: true,
    termsAcceptedAt: serverTimestamp(),
  }

  try {
    await setDoc(doc(db, "users", user.uid), userData)
  } catch (firestoreError) {
    await rollbackAuthUser()
    throw firestoreError
  }

  await sendWelcomeEmail({
    user_name: input.name.trim(),
    user_email: normalizedEmail,
    account_type: "cadete",
  }).catch(() => {})

  return { userId: user.uid }
}
