import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let app: any
const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "servidodb2"

if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  const firebaseAdminConfig = {
    projectId,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  // Initialize Firebase Admin
  app = !getApps().length 
    ? initializeApp({
        credential: cert(firebaseAdminConfig),
        projectId: firebaseAdminConfig.projectId,
      })
    : getApps()[0]
} else {
  if (!getApps().length) {
    app = initializeApp({
      projectId,
    })
  } else {
    app = getApps()[0]
  }
}

const auth = getAuth(app)
const db = getFirestore(app)

const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

const adminStorage = getStorage(app)

function getAdminStorageBucket() {
  if (storageBucket) {
    return adminStorage.bucket(storageBucket)
  }
  return adminStorage.bucket()
}

export { app, auth, db, getAdminStorageBucket }
