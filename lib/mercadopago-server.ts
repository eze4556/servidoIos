import { auth as adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { configureMercadoPago, getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import { ensureMercadoPagoSellerConnection } from "@/lib/mercadopago-oauth"
import { getMercadoPagoConnectionSnapshot } from "@/lib/mercadopago-connection"
import {
  addDoc,
  type DocumentReference,
  collection,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  updateDoc,
} from "firebase/firestore"
import { COMMISSION_RATE } from "@/types/centralized-payments"

export type ShippingAddress = {
  fullName: string
  phone: string
  dni: string
  address: string
  city: string
  state: string
  zipCode: string
  additionalInfo?: string
}

export type CreatePreferenceProduct = {
  productId: string
  quantity: number
}

export type CreatePreferencePayload = {
  products: CreatePreferenceProduct[]
  buyerId: string
  buyerEmail: string
  shippingCost?: number
  shippingAddress?: ShippingAddress
}

type StoredPendingProduct = {
  productId: string
  quantity: number
  vendedorId: string
  name: string
  price: number
  stock: number | null
  paidToSeller: boolean
}

type MercadoPagoStatus = "approved" | "pending" | "rejected" | "cancelled" | "refunded" | "unknown"

type WebhookResponse = {
  status: number
  body: Record<string, unknown>
}

const WEBHOOK_EVENTS_COLLECTION = "mercadopagoWebhookEvents"

function logMercadoPagoEvent(level: "info" | "warn" | "error", event: string, details: Record<string, unknown>) {
  const payload = {
    scope: "mercado-pago",
    event,
    ts: new Date().toISOString(),
    ...details,
  }

  const serialized = JSON.stringify(payload)
  if (level === "error") {
    console.error(serialized)
  } else if (level === "warn") {
    console.warn(serialized)
  } else {
    console.info(serialized)
  }
}

function normalizePaymentStatus(status: unknown): MercadoPagoStatus {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "approved" || normalized === "pending" || normalized === "rejected" || normalized === "cancelled" || normalized === "refunded") {
    return normalized
  }
  return "unknown"
}

function mapStatusToStoredState(status: MercadoPagoStatus) {
  if (status === "approved") return "pagado" as const
  if (status === "pending") return "pendiente" as const
  return "cancelado" as const
}

function logFirestoreAccess(operation: string, collectionName: string, documentId: unknown) {
  console.log({
    operation,
    collection: collectionName,
    documentId,
    typeofCollection: typeof collectionName,
    typeofDocumentId: typeof documentId,
  })
}

function getStatusPriority(status: MercadoPagoStatus) {
  switch (status) {
    case "pending":
      return 1
    case "rejected":
    case "cancelled":
      return 2
    case "approved":
      return 3
    case "refunded":
      return 4
    default:
      return 0
  }
}

function getBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorizationHeader?.startsWith("Bearer ")) return null
  return authorizationHeader.slice(7).trim()
}

async function requireAuthenticatedUser(request: Request, expectedUserId?: string) {
  const token = getBearerToken(request)
  if (!token) {
    throw new Error("No autorizado")
  }

  const decodedToken = await adminAuth.verifyIdToken(token)
  if (expectedUserId && decodedToken.uid !== expectedUserId) {
    throw new Error("El usuario autenticado no coincide con buyerId")
  }

  return decodedToken
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

function calculateCommission(amount: number) {
  return roundMoney(amount * COMMISSION_RATE)
}

function getProductImage(productData: any): string | undefined {
  if (typeof productData?.imageUrl === "string" && productData.imageUrl) {
    return productData.imageUrl
  }

  if (Array.isArray(productData?.media) && productData.media.length > 0) {
    const firstMedia = productData.media[0]
    if (typeof firstMedia === "string") return firstMedia
    if (typeof firstMedia?.url === "string" && firstMedia.url) return firstMedia.url
  }

  if (Array.isArray(productData?.images) && productData.images.length > 0) {
    const firstImage = productData.images[0]
    if (typeof firstImage === "string") return firstImage
    if (typeof firstImage?.url === "string" && firstImage.url) return firstImage.url
  }

  return undefined
}

function getProductSellerId(productData: any) {
  return productData?.sellerId || productData?.vendedorId || productData?.userId || ""
}

async function getSellerInfo(sellerId: string) {
  if (!sellerId) return { name: "Vendedor", email: "" }

  const sellerDoc = await getDoc(doc(db, "users", sellerId))
  if (!sellerDoc.exists()) {
    return { name: "Vendedor", email: "" }
  }

  const sellerData = sellerDoc.data() as any
  return {
    name: sellerData.name || sellerData.displayName || sellerData.fullName || "Vendedor",
    email: sellerData.email || "",
  }
}

export async function createMercadoPagoProductPreference(request: Request, body: CreatePreferencePayload) {
  const { products, buyerId, buyerEmail, shippingCost, shippingAddress } = body

  if (!buyerId || !buyerEmail) {
    throw new Error("Faltan buyerId o buyerEmail")
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("El array de productos es inválido o está vacío")
  }

  await requireAuthenticatedUser(request, buyerId)

  const validatedProducts: Array<{
    productoId: string
    cantidad: number
    precioUnitario: number
    subtotal: number
    comisionApp: number
    montoVendedor: number
    estadoPagoVendedor: "pendiente"
    productoNombre: string
    productoImagen?: string
    productoIsService: boolean
    vendedorId: string
    vendedorNombre: string
    vendedorEmail: string
  }> = []
  const sellerConnectionCache = new Map<string, boolean>()

  let subtotal = 0
  let totalCommission = 0

  for (const [index, product] of products.entries()) {
    const { productId, quantity } = product

    if (!productId || typeof productId !== "string" || typeof quantity !== "number" || quantity <= 0) {
      throw new Error(`Datos inválidos en el producto ${index}`)
    }

    const productDoc = await getDoc(doc(db, "products", productId))
    if (!productDoc.exists()) {
      throw new Error(`Producto no encontrado: ${productId}`)
    }

    const productData = productDoc.data() as any
    if (productData.disponible === false) {
      throw new Error(`El producto ${productData.name || productId} no está disponible`)
    }

    if (typeof productData.stock === "number" && productData.stock < quantity) {
      throw new Error(`Stock insuficiente para el producto ${productData.name || productId}`)
    }

    const sellerId = getProductSellerId(productData)
    if (!sellerId) {
      throw new Error(`El producto ${productId} no tiene vendedor asociado`)
    }

    if (!sellerConnectionCache.has(sellerId)) {
      await ensureMercadoPagoSellerConnection(sellerId)
      sellerConnectionCache.set(sellerId, true)
    }

    const sellerInfo = await getSellerInfo(sellerId)
    const unitPrice = Number(productData.price) || 0
    const lineSubtotal = roundMoney(unitPrice * quantity)
    const commission = calculateCommission(lineSubtotal)
    const sellerAmount = roundMoney(lineSubtotal - commission)

    validatedProducts.push({
      productoId: productId,
      cantidad: quantity,
      precioUnitario: unitPrice,
      subtotal: lineSubtotal,
      comisionApp: commission,
      montoVendedor: sellerAmount,
      estadoPagoVendedor: "pendiente",
      productoNombre: productData.name || productData.title || "Producto",
      productoImagen: getProductImage(productData),
      productoIsService: Boolean(productData.isService),
      vendedorId: sellerId,
      vendedorNombre: sellerInfo.name,
      vendedorEmail: sellerInfo.email,
    })

    subtotal += lineSubtotal
    totalCommission += commission
  }

  const calculatedShippingCost =
    shippingCost === undefined || shippingCost === null
      ? 500
      : shippingCost > 0
        ? shippingCost
        : 0

  const total = roundMoney(subtotal + calculatedShippingCost)
  const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const preference = configureMercadoPago()

  const items = validatedProducts.map((product) => ({
    id: product.productoId,
    title: product.productoNombre,
    quantity: product.cantidad,
    unit_price: product.precioUnitario,
    currency_id: "ARS",
  }))

  if (calculatedShippingCost > 0) {
    items.push({
      id: "shipping_cost",
      title: "Costo de envío",
      quantity: 1,
      unit_price: calculatedShippingCost,
      currency_id: "ARS",
    })
  }

  const siteUrl = getMercadoPagoSiteUrl(request)
  const preferenceData: Record<string, any> = {
    items,
    back_urls: {
      success: `${siteUrl}/purchase/success`,
      failure: `${siteUrl}/purchase/failure`,
      pending: `${siteUrl}/purchase/pending`,
    },
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
    external_reference: purchaseId,
    payer: {
      email: buyerEmail,
    },
  }

  if (preferenceData.back_urls.success) {
    preferenceData.auto_return = "approved"
  }

  const result = await preference.preferences.create(preferenceData)

  const pendingProducts: StoredPendingProduct[] = validatedProducts.map((product) => ({
    productId: product.productoId,
    quantity: product.cantidad,
    vendedorId: product.vendedorId,
    name: product.productoNombre,
    price: product.precioUnitario,
    stock: null,
    paidToSeller: false,
  }))

  const batch = writeBatch(db)

  batch.set(doc(db, "pending_purchases", purchaseId), {
    buyerId,
    buyerEmail,
    products: pendingProducts,
    totalAmount: subtotal,
    shippingCost: calculatedShippingCost,
    finalTotal: total,
    status: "pending",
    createdAt: serverTimestamp(),
    preferenceId: result.id,
    externalReference: purchaseId,
    shippingAddress: shippingAddress || null,
  })

  batch.set(doc(db, "centralizedPurchases", purchaseId), {
    id: purchaseId,
    compradorId: buyerId,
    fecha: new Date().toISOString(),
    items: validatedProducts,
    total,
    comisionTotal: totalCommission,
    estadoPago: "pendiente",
    estadoEnvio: "pendiente",
    mediosPago: "mercadopago",
    mercadoPagoPaymentId: "",
    shippingAddress: shippingAddress || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    preferenceId: result.id,
    externalReference: purchaseId,
  })

  await batch.commit()

  logMercadoPagoEvent("info", "create_preference_success", {
    purchaseId,
    buyerId,
    buyerEmail,
    itemCount: validatedProducts.length,
    subtotal,
    shipping: calculatedShippingCost,
    total,
  })

  return {
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
    purchaseId,
    totals: {
      subtotal,
      shipping: calculatedShippingCost,
      final: total,
    },
  }
}

async function fetchMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error consultando pago en MercadoPago: ${response.status} ${errorText}`)
  }

  return response.json()
}

async function updateCentralizedPurchaseStatus(
  purchaseId: string,
  status: "approved" | "rejected" | "cancelled" | "pending",
  paymentId: string
) {
  logFirestoreAccess("doc", "centralizedPurchases", purchaseId)
  const purchaseRef = doc(db, "centralizedPurchases", purchaseId)
  logFirestoreAccess("getDoc", "centralizedPurchases", purchaseId)
  const purchaseSnap = await getDoc(purchaseRef)

  if (!purchaseSnap.exists()) {
    return
  }

  const purchaseData = purchaseSnap.data() as any
  const updatedItems = Array.isArray(purchaseData.items)
    ? purchaseData.items.map((item: any) => ({
        ...item,
        estadoPagoVendedor: status === "approved" ? "pagado" : status === "pending" ? "pendiente" : "cancelado",
        fechaPagoVendedor: status === "approved" ? new Date().toISOString() : item.fechaPagoVendedor,
      }))
    : []

  logFirestoreAccess("updateDoc", "centralizedPurchases", purchaseId)
  await updateDoc(purchaseRef, {
    estadoPago: mapStatusToStoredState(status as MercadoPagoStatus),
    estadoEnvio: status === "approved" ? "pendiente" : "cancelado",
    mercadoPagoPaymentId: paymentId,
    paymentStatusRaw: status,
    items: updatedItems,
    updatedAt: serverTimestamp(),
  })
}

async function syncLegacyPurchaseRecord(purchaseId: string, paymentInfo: any, pendingPurchaseData: any) {
  logFirestoreAccess("doc", "purchases", purchaseId)
  logFirestoreAccess("setDoc", "purchases", purchaseId)
  await setDoc(doc(db, "purchases", purchaseId), {
    id: purchaseId,
    buyerId: pendingPurchaseData.buyerId,
    buyerEmail: pendingPurchaseData.buyerEmail,
    products: pendingPurchaseData.products,
    paymentId: paymentInfo.id,
    status: paymentInfo.status,
    paymentStatusRaw: paymentInfo.status,
    totalAmount: pendingPurchaseData.totalAmount,
    shippingCost: pendingPurchaseData.shippingCost || 0,
    finalTotal: pendingPurchaseData.finalTotal || pendingPurchaseData.totalAmount,
    paidToSellers: false,
    createdAt: new Date(),
    ...(pendingPurchaseData.shippingAddress && { shippingAddress: pendingPurchaseData.shippingAddress }),
    purchaseId,
  })
}

function normalizePurchaseSourceData(sourceData: any) {
  const products = Array.isArray(sourceData?.products)
    ? sourceData.products
    : Array.isArray(sourceData?.items)
      ? sourceData.items.map((item: any) => ({
          productId: item.productId || item.productoId || item.id || item.product?.id,
          quantity: item.quantity || item.cantidad || 1,
        }))
      : []

  return {
    products: products.filter((item: any) => Boolean(item?.productId)),
    buyerId: sourceData?.buyerId || sourceData?.compradorId || sourceData?.userId || "",
    buyerEmail: sourceData?.buyerEmail || sourceData?.compradorEmail || sourceData?.email || "",
    totalAmount: sourceData?.totalAmount || sourceData?.total || sourceData?.subtotal || 0,
    shippingCost: sourceData?.shippingCost || sourceData?.costoEnvio || 0,
    finalTotal: sourceData?.finalTotal || sourceData?.totalFinal || sourceData?.totalAmount || sourceData?.total || 0,
    shippingAddress: sourceData?.shippingAddress || sourceData?.direccionEnvio || null,
  }
}

async function handleApprovedPurchase(paymentInfo: any, purchaseId: string) {
  logFirestoreAccess("doc", "pending_purchases", purchaseId)
  const pendingPurchaseRef = doc(db, "pending_purchases", purchaseId)
  logFirestoreAccess("doc", "centralizedPurchases", purchaseId)
  const centralizedPurchaseRef = doc(db, "centralizedPurchases", purchaseId)
  logFirestoreAccess("doc", "failed_purchases", paymentInfo.id)
  const failedPurchaseRef = doc(db, "failed_purchases", paymentInfo.id)
  logFirestoreAccess("doc", "purchases", purchaseId)
  const legacyPurchaseRef = doc(db, "purchases", purchaseId)

  logFirestoreAccess("runTransaction", "pending_purchases", purchaseId)
  logFirestoreAccess("runTransaction", "centralizedPurchases", purchaseId)
  logFirestoreAccess("runTransaction", "failed_purchases", paymentInfo.id)
  logFirestoreAccess("runTransaction", "purchases", purchaseId)
  await runTransaction(db, async (transaction) => {
    logFirestoreAccess("transaction.get", "pending_purchases", purchaseId)
    const pendingPurchaseDoc = await transaction.get(pendingPurchaseRef)
    logFirestoreAccess("transaction.get", "centralizedPurchases", purchaseId)
    const centralizedPurchaseDoc = await transaction.get(centralizedPurchaseRef)

    if (!pendingPurchaseDoc.exists() && !centralizedPurchaseDoc.exists()) {
      throw new Error("Compra pendiente no encontrada")
    }

    const sourceData = (pendingPurchaseDoc.exists() ? pendingPurchaseDoc.data() : centralizedPurchaseDoc.data()) as any
    const normalizedPurchase = normalizePurchaseSourceData(sourceData)
    const {
      products,
      buyerId,
      buyerEmail,
      totalAmount,
      shippingCost,
      finalTotal,
      shippingAddress,
    } = normalizedPurchase

    for (const prod of products) {
      logFirestoreAccess("doc", "products", prod.productId)
      const productRef = doc(db, "products", prod.productId)
      logFirestoreAccess("transaction.get", "products", prod.productId)
      const productDoc = await transaction.get(productRef)

      if (!productDoc.exists()) continue

      const productData = productDoc.data() as any
      if (typeof productData.stock === "number") {
        if (productData.stock < prod.quantity) {
          logFirestoreAccess("transaction.set", "failed_purchases", paymentInfo.id)
          transaction.set(failedPurchaseRef, {
            reason: "Stock insuficiente en webhook",
            ...prod,
            buyerId,
            paymentId: paymentInfo.id,
            purchaseId,
            createdAt: new Date(),
            paymentStatusRaw: paymentInfo.status,
          }, { merge: true })
          continue
        }

        logFirestoreAccess("transaction.update", "products", prod.productId)
        transaction.update(productRef, {
          stock: productData.stock - prod.quantity,
        })
      }
    }

    logFirestoreAccess("transaction.set", "purchases", purchaseId)
    transaction.set(legacyPurchaseRef, {
      id: purchaseId,
      buyerId,
      buyerEmail,
      products,
      paymentId: paymentInfo.id,
      status: paymentInfo.status,
      paymentStatusRaw: paymentInfo.status,
      totalAmount,
      shippingCost,
      finalTotal,
      paidToSellers: false,
      createdAt: new Date(),
      ...(shippingAddress && { shippingAddress }),
      purchaseId,
    }, { merge: true })

    logFirestoreAccess("transaction.set", "centralizedPurchases", purchaseId)
    transaction.set(centralizedPurchaseRef, {
      estadoPago: "pagado",
      estadoEnvio: "pendiente",
      mercadoPagoPaymentId: paymentInfo.id,
      paymentStatusRaw: paymentInfo.status,
      items: products.map((item: any) => ({
        ...item,
        estadoPagoVendedor: "pagado",
        fechaPagoVendedor: new Date().toISOString(),
      })),
      updatedAt: new Date(),
      paidToSellers: false,
    }, { merge: true })

    logFirestoreAccess("transaction.delete", "pending_purchases", purchaseId)
    transaction.delete(pendingPurchaseRef)
  })
}

async function handleRejectedPurchase(paymentInfo: any, purchaseId: string) {
  logFirestoreAccess("doc", "pending_purchases", purchaseId)
  const pendingPurchaseRef = doc(db, "pending_purchases", purchaseId)
  logFirestoreAccess("doc", "centralizedPurchases", purchaseId)
  const centralizedPurchaseRef = doc(db, "centralizedPurchases", purchaseId)
  logFirestoreAccess("doc", "purchases", purchaseId)
  const legacyPurchaseRef = doc(db, "purchases", purchaseId)

  logFirestoreAccess("runTransaction", "pending_purchases", purchaseId)
  logFirestoreAccess("runTransaction", "centralizedPurchases", purchaseId)
  logFirestoreAccess("runTransaction", "purchases", purchaseId)
  await runTransaction(db, async (transaction) => {
    logFirestoreAccess("transaction.get", "centralizedPurchases", purchaseId)
    const centralizedPurchaseDoc = await transaction.get(centralizedPurchaseRef)
    if (centralizedPurchaseDoc.exists()) {
      const currentData = centralizedPurchaseDoc.data() as any
      const items = Array.isArray(currentData.items)
        ? currentData.items.map((item: any) => ({
            ...item,
            estadoPagoVendedor: "cancelado",
          }))
        : []

      logFirestoreAccess("transaction.set", "centralizedPurchases", purchaseId)
      transaction.set(centralizedPurchaseRef, {
        estadoPago: "cancelado",
        estadoEnvio: "cancelado",
        mercadoPagoPaymentId: paymentInfo.id,
        paymentStatusRaw: paymentInfo.status,
        items,
        updatedAt: new Date(),
      }, { merge: true })
    }

    logFirestoreAccess("transaction.set", "purchases", purchaseId)
    transaction.set(legacyPurchaseRef, {
      status: paymentInfo.status,
      paymentStatusRaw: paymentInfo.status,
      paymentId: paymentInfo.id,
      purchaseId,
      updatedAt: new Date(),
    }, { merge: true })

    logFirestoreAccess("transaction.delete", "pending_purchases", purchaseId)
    transaction.delete(pendingPurchaseRef)
  })
}

async function handleRefundedPurchase(paymentInfo: any, purchaseId: string) {
  logFirestoreAccess("doc", "centralizedPurchases", purchaseId)
  const centralizedPurchaseRef = doc(db, "centralizedPurchases", purchaseId)
  logFirestoreAccess("doc", "purchases", purchaseId)
  const legacyPurchaseRef = doc(db, "purchases", purchaseId)

  logFirestoreAccess("runTransaction", "centralizedPurchases", purchaseId)
  logFirestoreAccess("runTransaction", "purchases", purchaseId)
  await runTransaction(db, async (transaction) => {
    logFirestoreAccess("transaction.get", "centralizedPurchases", purchaseId)
    const centralizedPurchaseDoc = await transaction.get(centralizedPurchaseRef)
    if (centralizedPurchaseDoc.exists()) {
      const currentData = centralizedPurchaseDoc.data() as any
      const items = Array.isArray(currentData.items)
        ? currentData.items.map((item: any) => ({
            ...item,
            estadoPagoVendedor: "cancelado",
          }))
        : []

      logFirestoreAccess("transaction.set", "centralizedPurchases", purchaseId)
      transaction.set(centralizedPurchaseRef, {
        estadoPago: "cancelado",
        estadoEnvio: currentData.estadoEnvio === "cancelado" ? "cancelado" : currentData.estadoEnvio,
        mercadoPagoPaymentId: paymentInfo.id,
        paymentStatusRaw: paymentInfo.status,
        items,
        updatedAt: new Date(),
      }, { merge: true })
    }

    logFirestoreAccess("transaction.set", "purchases", purchaseId)
    transaction.set(legacyPurchaseRef, {
      status: paymentInfo.status,
      paymentStatusRaw: paymentInfo.status,
      paymentId: paymentInfo.id,
      purchaseId,
      updatedAt: new Date(),
    }, { merge: true })
  })
}

async function handleSubscriptionPayment(externalReference: string, paymentInfo: any) {
  const [, userId, planType = "basic"] = externalReference.split("_")

  if (!userId) {
    throw new Error("Referencia de suscripción inválida")
  }

  logFirestoreAccess("doc", "users", userId)
  logFirestoreAccess("doc", "subscriptions", paymentInfo.id)
  logFirestoreAccess("doc", "transactions", paymentInfo.id)
  const paymentDocumentId = String(paymentInfo.id)
  const subscriptionStart = new Date()
  const subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  logFirestoreAccess("runTransaction", "users", userId)
  logFirestoreAccess("runTransaction", "subscriptions", paymentInfo.id)
  logFirestoreAccess("runTransaction", "transactions", paymentInfo.id)
  await runTransaction(db, async (transaction) => {
    logFirestoreAccess("transaction.set", "users", userId)
    transaction.set(
      doc(db, "users", userId),
      {
        role: "seller",
        subscription_status: "active",
        isSubscribed: true,
        subscription: {
          status: "active",
          plan: planType,
          startDate: subscriptionStart,
          endDate: subscriptionEnd,
          lastPaymentDate: subscriptionStart,
          paymentId: paymentInfo.id,
          paymentStatusRaw: paymentInfo.status,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    logFirestoreAccess("transaction.set", "subscriptions", paymentDocumentId)
    transaction.set(doc(db, "subscriptions", paymentDocumentId), {
      id: paymentInfo.id,
      userId,
      planType,
      paymentId: paymentInfo.id,
      autoRenew: true,
      status: "active",
      paymentStatusRaw: paymentInfo.status,
      startDate: subscriptionStart,
      endDate: subscriptionEnd,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true })

    logFirestoreAccess("transaction.set", "transactions", paymentDocumentId)
    transaction.set(doc(db, "transactions", paymentDocumentId), {
      id: paymentInfo.id,
      userId,
      amount: paymentInfo.transaction_amount,
      status: paymentInfo.status,
      paymentStatusRaw: paymentInfo.status,
      paymentId: paymentInfo.id,
      planType,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true })
  })
}

async function reserveWebhookEvent(params: {
  paymentId: string
  externalReference: string
  status: MercadoPagoStatus
  eventType?: string
}) {
  logFirestoreAccess("doc", WEBHOOK_EVENTS_COLLECTION, params.paymentId)
  const eventRef = doc(db, WEBHOOK_EVENTS_COLLECTION, params.paymentId)
  const statusPriority = getStatusPriority(params.status)

  logFirestoreAccess("runTransaction", WEBHOOK_EVENTS_COLLECTION, params.paymentId)
  return runTransaction(db, async (transaction) => {
    logFirestoreAccess("transaction.get", WEBHOOK_EVENTS_COLLECTION, params.paymentId)
    const eventSnap = await transaction.get(eventRef)
    const eventData = eventSnap.exists() ? (eventSnap.data() as any) : null
    const processedStatuses: string[] = Array.isArray(eventData?.processedStatuses) ? eventData.processedStatuses : []
    const highestStatusRank = typeof eventData?.highestStatusRank === "number" ? eventData.highestStatusRank : 0

    if (statusPriority <= highestStatusRank) {
      return { shouldProcess: false, duplicate: true, eventRef }
    }

    if (eventData?.inFlightStatus === params.status) {
      return { shouldProcess: false, duplicate: true, eventRef }
    }

    const now = new Date()
    const nextAttempts = (eventData?.attempts || 0) + 1
    const nextPayload = {
      paymentId: params.paymentId,
      externalReference: params.externalReference,
      lastStatus: params.status,
      inFlightStatus: params.status,
      eventType: params.eventType || "payment",
      attempts: nextAttempts,
      state: "processing",
      highestStatusRank: Math.max(highestStatusRank, statusPriority),
      updatedAt: now,
      lastEventAt: now,
      receivedAt: eventData?.receivedAt || now,
    }

    if (eventSnap.exists()) {
      logFirestoreAccess("transaction.set", WEBHOOK_EVENTS_COLLECTION, params.paymentId)
      transaction.set(eventRef, nextPayload, { merge: true })
    } else {
      logFirestoreAccess("transaction.set", WEBHOOK_EVENTS_COLLECTION, params.paymentId)
      transaction.set(eventRef, {
        ...nextPayload,
        processedStatuses: [],
        createdAt: now,
      })
    }

    return { shouldProcess: true, duplicate: false, eventRef }
  })
}

async function markWebhookEventProcessed(
  eventRef: DocumentReference,
  status: MercadoPagoStatus,
  purchaseId?: string
) {
  const statusPriority = getStatusPriority(status)
  logFirestoreAccess("runTransaction", WEBHOOK_EVENTS_COLLECTION, eventRef.id)
  await runTransaction(db, async (transaction) => {
    logFirestoreAccess("transaction.get", WEBHOOK_EVENTS_COLLECTION, eventRef.id)
    const eventSnap = await transaction.get(eventRef)
    const eventData = eventSnap.exists() ? (eventSnap.data() as any) : null
    const processedStatuses: string[] = Array.isArray(eventData?.processedStatuses) ? eventData.processedStatuses : []
    const nextProcessedStatuses = processedStatuses.includes(status) ? processedStatuses : [...processedStatuses, status]

    logFirestoreAccess("transaction.set", WEBHOOK_EVENTS_COLLECTION, eventRef.id)
    transaction.set(
      eventRef,
      {
        paymentStatusRaw: status,
        state: "processed",
        inFlightStatus: null,
        processedStatuses: nextProcessedStatuses,
        highestStatusRank: Math.max(typeof eventData?.highestStatusRank === "number" ? eventData.highestStatusRank : 0, statusPriority),
        lastProcessedAt: new Date(),
        updatedAt: new Date(),
        ...(purchaseId ? { purchaseId } : {}),
      },
      { merge: true }
    )
  })
}

async function markWebhookEventFailed(eventRef: DocumentReference, errorMessage: string) {
  logFirestoreAccess("setDoc", WEBHOOK_EVENTS_COLLECTION, eventRef.id)
  await setDoc(
    eventRef,
    {
      state: "error",
      inFlightStatus: null,
      lastError: errorMessage,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  )
}

export async function handleMercadoPagoWebhook(request: Request): Promise<WebhookResponse> {
  const payload = await request.json().catch(() => ({}))
  const paymentId = payload?.data?.id || payload?.data?.payment_id || payload?.id

  if (!paymentId) {
    logMercadoPagoEvent("warn", "webhook_invalid_payload", {
      reason: "missing_payment_id",
      eventType: payload?.type || payload?.topic || payload?.action || null,
    })
    return {
      status: 400,
      body: { received: false, handled: false, error: "payment_id requerido" },
    }
  }

  let paymentInfo: any

  try {
    paymentInfo = await fetchMercadoPagoPayment(String(paymentId))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error consultando pago"
    logMercadoPagoEvent("error", "webhook_payment_fetch_failed", {
      paymentId: String(paymentId),
      error: errorMessage,
    })
    return {
      status: 502,
      body: { received: false, handled: false, error: "No se pudo consultar el pago" },
    }
  }

  const externalReference = String(paymentInfo.external_reference || "")
  const status = normalizePaymentStatus(paymentInfo.status)
  const eventType = String(payload?.type || payload?.topic || payload?.action || "payment")
  const eventContext = {
    paymentId: String(paymentId),
    externalReference,
    status,
    eventType,
  }

  logMercadoPagoEvent("info", "webhook_received", eventContext)

  if (!externalReference) {
    logMercadoPagoEvent("warn", "webhook_missing_external_reference", eventContext)
    return {
      status: 202,
      body: { received: true, handled: false, skipped: true },
    }
  }

  const reservation = await reserveWebhookEvent({
    paymentId: String(paymentId),
    externalReference,
    status,
    eventType,
  })

  if (!reservation.shouldProcess) {
    logMercadoPagoEvent("info", "webhook_duplicate_skipped", eventContext)
    return {
      status: 200,
      body: { received: true, handled: false, duplicate: true },
    }
  }

  try {
    if (externalReference.startsWith("purchase_")) {
      if (status === "approved") {
        await handleApprovedPurchase(paymentInfo, externalReference)
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        logMercadoPagoEvent("info", "webhook_purchase_processed", {
          ...eventContext,
          action: "approved_purchase",
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "purchase", status, duplicate: false },
        }
      }

      if (status === "pending") {
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        await updateCentralizedPurchaseStatus(externalReference, "pending", String(paymentId))
        logMercadoPagoEvent("info", "webhook_purchase_pending", {
          ...eventContext,
          action: "pending_purchase",
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "purchase", status, duplicate: false },
        }
      }

      if (status === "rejected" || status === "cancelled") {
        await handleRejectedPurchase(paymentInfo, externalReference)
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        logMercadoPagoEvent("info", "webhook_purchase_cancelled", {
          ...eventContext,
          action: `purchase_${status}`,
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "purchase", status, duplicate: false },
        }
      }

      if (status === "refunded") {
        await handleRefundedPurchase(paymentInfo, externalReference)
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        logMercadoPagoEvent("info", "webhook_purchase_refunded", {
          ...eventContext,
          action: "purchase_refunded",
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "purchase", status, duplicate: false },
        }
      }

      await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
      logMercadoPagoEvent("warn", "webhook_purchase_unhandled_status", {
        ...eventContext,
        action: "purchase_unhandled_status",
      })
      return {
        status: 202,
        body: { received: true, handled: false, status },
      }
    }

    if (externalReference.startsWith("subscription_")) {
      if (status === "approved") {
        await handleSubscriptionPayment(externalReference, paymentInfo)
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        logMercadoPagoEvent("info", "webhook_subscription_processed", {
          ...eventContext,
          action: "subscription_approved",
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "subscription", status, duplicate: false },
        }
      }

      if (status === "pending" || status === "rejected" || status === "cancelled" || status === "refunded") {
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        logMercadoPagoEvent("info", "webhook_subscription_status", {
          ...eventContext,
          action: `subscription_${status}`,
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "subscription", status, duplicate: false },
        }
      }
    }

    await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
    logMercadoPagoEvent("warn", "webhook_unhandled_reference", {
      ...eventContext,
      action: "unhandled_reference",
    })
    return {
      status: 202,
      body: { received: true, handled: false, status },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error procesando webhook"
    logMercadoPagoEvent("error", "webhook_processing_failed", {
      ...eventContext,
      error: errorMessage,
    })
    await markWebhookEventFailed(reservation.eventRef, errorMessage)
    return {
      status: 500,
      body: { received: false, handled: false, error: errorMessage },
    }
  }
}

export async function getMercadoPagoConnectionStatus(request: Request, userId?: string) {
  const decodedUser = await requireAuthenticatedUser(request, userId)
  const resolvedUserId = userId || decodedUser.uid

  const userDoc = await getDoc(doc(db, "users", resolvedUserId))
  if (!userDoc.exists()) {
    return {
      connected: false,
      tokenExpired: false,
      status: "not_connected",
      expiresAt: null,
      connectedAt: null,
      accountId: null,
      userId: resolvedUserId,
    }
  }

  const userData = userDoc.data() as any
  const snapshot = getMercadoPagoConnectionSnapshot(userData)

  return {
    connected: snapshot.connected,
    tokenExpired: snapshot.tokenExpired,
    status: snapshot.status,
    expiresAt: snapshot.expiresAt ? snapshot.expiresAt.toISOString() : null,
    connectedAt: snapshot.connectedAt ? snapshot.connectedAt.toISOString() : null,
    accountId: snapshot.accountId,
    userId: resolvedUserId,
  }
}
