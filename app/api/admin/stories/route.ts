import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { auth as adminAuth, db, getAdminStorageBucket } from "@/lib/firebase-admin"
import { isFirestoreAdmin } from "@/lib/admin-auth-server"
import {
  SERVIDO_OFFICIAL_LOGO_PATH,
  SERVIDO_OFFICIAL_USER_ID,
} from "@/lib/servido-official"
import { STORY_DURATION_MS } from "@/types/story"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader =
      request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    if (!(await isFirestoreAdmin(decoded.uid))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get("file")
    const caption = String(form.get("caption") || "").trim().slice(0, 180)
    const linkUrlRaw = String(form.get("linkUrl") || "").trim()
    const linkUrl = linkUrlRaw || null

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "La imagen es obligatoria" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no puede superar 8MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg"
    const imagePath = `stories/${SERVIDO_OFFICIAL_USER_ID}/${Date.now()}.${safeExt}`
    const downloadToken = randomUUID()
    const bucket = getAdminStorageBucket()
    const gcsFile = bucket.file(imagePath)
    await gcsFile.save(buffer, {
      metadata: {
        contentType: file.type || "image/jpeg",
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
        cacheControl: "public,max-age=31536000",
      },
    })
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(imagePath)}?alt=media&token=${downloadToken}`

    const now = new Date()
    const expiresAt = new Date(now.getTime() + STORY_DURATION_MS)
    const storyRef = db.collection("stories").doc()
    await storyRef.set({
      authorId: SERVIDO_OFFICIAL_USER_ID,
      authorName: "Servido",
      authorPhotoURL: SERVIDO_OFFICIAL_LOGO_PATH,
      authorType: "platform",
      imageUrl,
      imagePath,
      caption: caption || null,
      linkUrl,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      isActive: true,
      viewCount: 0,
      authorLatitude: null,
      authorLongitude: null,
      authorCity: null,
      authorLocationLabel: null,
      createdByAdminId: decoded.uid,
    })

    return NextResponse.json({
      ok: true,
      id: storyRef.id,
      imageUrl,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("POST /api/admin/stories", error)
    return NextResponse.json({ error: "No se pudo publicar la historia" }, { status: 500 })
  }
}
