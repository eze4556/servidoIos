import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { auth as adminAuth, db, getAdminStorageBucket } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"])

const listingSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(2).max(2000),
  price: z.number().positive().nullable(),
  categoryName: z.string().min(1).max(80),
  isService: z.boolean(),
  condition: z.enum(["new", "used"]),
})

function parsePriceFromText(text: string): number | null {
  const cleaned = text.replace(/\./g, "").replace(/,/g, ".")
  const match = cleaned.match(/(?:\$|ars|precio|por)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:pesos|ars)?/i)
  if (!match) return null
  const raw = match[1] || match[2]
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function matchCategory(
  categories: Array<{ id: string; name: string }>,
  hint: string
): { id: string; name: string } | null {
  if (!categories.length) return null
  const needle = hint.trim().toLowerCase()
  const exact = categories.find((c) => c.name.toLowerCase() === needle)
  if (exact) return exact
  const partial = categories.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
  )
  if (partial) return partial
  // Prefer generic product categories
  const fallback =
    categories.find((c) => /otro|geral|general|produto|producto|servicio|serviço/i.test(c.name)) ||
    categories[0]
  return fallback || null
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ error: "missing_openai_key" }, { status: 503 })
    }

    const authorizationHeader =
      request.headers.get("authorization") || request.headers.get("Authorization")
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authorizationHeader.slice(7).trim())
    const uid = decoded.uid
    const userSnap = await db.collection("users").doc(uid).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 })
    }

    const userData = userSnap.data() || {}
    const role = String(userData.role || "user")
    const businessType = userData.businessType === "restaurant" ? "restaurant" : "store"

    if (role !== "seller" && role !== "admin") {
      return NextResponse.json({ error: "not_seller", needsStore: true }, { status: 403 })
    }
    if (role === "seller" && businessType === "restaurant") {
      return NextResponse.json({ error: "restaurant_not_supported" }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get("image")
    const caption = String(form.get("caption") || "").trim()
    const forcePublish = String(form.get("publish") || "true") !== "false"
    const priceOverride = Number(form.get("price"))
    const nameOverride = String(form.get("name") || "").trim()
    const isServiceOverride = form.get("isService")
    const locale = String(form.get("locale") || "es")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image_required" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_image" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "image_too_large" }, { status: 400 })
    }

    const uploadLimit = Number(userData.productUploadLimit)
    if (Number.isFinite(uploadLimit) && uploadLimit > 0) {
      const countSnap = await db.collection("products").where("sellerId", "==", uid).count().get()
      const count = countSnap.data().count ?? 0
      if (count >= uploadLimit) {
        return NextResponse.json({ error: "upload_limit" }, { status: 403 })
      }
    }

    const categoriesSnap = await db.collection("categories").get()
    const categories = categoriesSnap.docs
      .map((doc) => ({ id: doc.id, name: String(doc.data()?.name || "").trim() }))
      .filter((c) => c.name)

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")
    const mediaType = file.type || "image/jpeg"
    const dataUrl = `data:${mediaType};base64,${base64}`

    const isPt = locale === "pt-BR"
    const categoryList = categories.map((c) => c.name).slice(0, 80).join(", ")

    const { object: draft } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: listingSchema,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: isPt
                ? `Analise a foto de um anúncio do marketplace Servido (produtos ou serviços).
Caption do vendedor: "${caption || "(vazio)"}".
Categorias disponíveis: ${categoryList || "Geral"}.
Extraia nome curto, descrição útil, preço se aparecer ou se o caption disser, categoryName (uma das categorias), isService (true se for serviço), condition new|used.
Se não houver preço claro, price=null. Não invente preços altos sem base.`
                : `Analizá la foto de un aviso del marketplace Servido (productos o servicios).
Texto del vendedor: "${caption || "(vacío)"}".
Categorías disponibles: ${categoryList || "General"}.
Extraé nombre corto, descripción útil, precio si se ve o si el texto lo dice, categoryName (una de las categorías), isService (true si es servicio), condition new|used.
Si no hay precio claro, price=null. No inventes precios altos sin base.`,
            },
            { type: "image", image: dataUrl },
          ],
        },
      ],
    })

    const priceFromCaption = parsePriceFromText(caption)
    const price =
      (Number.isFinite(priceOverride) && priceOverride > 0 ? priceOverride : null) ||
      priceFromCaption ||
      (typeof draft.price === "number" && draft.price > 0 ? draft.price : null)

    const name = nameOverride || draft.name
    const isService =
      isServiceOverride === "true"
        ? true
        : isServiceOverride === "false"
          ? false
          : draft.isService

    const category = matchCategory(categories, draft.categoryName)

    if (!price || !forcePublish) {
      return NextResponse.json({
        ok: true,
        published: false,
        needsPrice: !price,
        draft: {
          name,
          description: draft.description,
          price,
          categoryId: category?.id || null,
          categoryName: category?.name || draft.categoryName,
          isService,
          condition: draft.condition,
        },
      })
    }

    if (!category) {
      return NextResponse.json({ error: "category_missing" }, { status: 400 })
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg"
    const imagePath = `products/${uid}/${Date.now()}-${randomUUID().slice(0, 8)}.${safeExt}`
    const downloadToken = randomUUID()
    const bucket = getAdminStorageBucket()
    const gcsFile = bucket.file(imagePath)
    await gcsFile.save(buffer, {
      metadata: {
        contentType: mediaType,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
        cacheControl: "public,max-age=31536000",
      },
    })
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(imagePath)}?alt=media&token=${downloadToken}`

    const productRef = db.collection("products").doc()
    const productData: Record<string, unknown> = {
      name: name.trim(),
      description: draft.description.trim(),
      price: Math.round(price),
      category: category.id,
      media: [{ type: "image", url: imageUrl, path: imagePath }],
      imageUrl,
      isService,
      sellerId: uid,
      stock: isService ? 0 : 1,
      condition: isService ? "new" : draft.condition,
      freeShipping: true,
      shippingCost: 0,
      allowResellerShare: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      publishedVia: "servido-bot",
    }

    await productRef.set(productData)

    return NextResponse.json({
      ok: true,
      published: true,
      productId: productRef.id,
      href: `/product/${productRef.id}`,
      draft: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        categoryId: category.id,
        categoryName: category.name,
        isService,
        condition: productData.condition,
        imageUrl,
      },
    })
  } catch (error) {
    console.error("[seller/products/from-image]", error)
    return NextResponse.json({ error: "publish_failed" }, { status: 500 })
  }
}
