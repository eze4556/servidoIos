import { auth as adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { configureMercadoPago, getMercadoPagoSiteUrl } from "@/lib/mercadopago"
import {
  ensureMercadoPagoSellerConnection,
  getMercadoPagoSellerAccessToken,
} from "@/lib/mercadopago-oauth"
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
  /** Envío por vendedor (checkout multi-vendedor). Clave = sellerId */
  shippingBySeller?: Record<string, number>
  shippingAddress?: ShippingAddress
}

export type CheckoutSellerPayment = {
  sellerId: string
  sellerName: string
  purchaseId: string
  preferenceId: string | null
  init_point: string | null
  sandbox_init_point: string | null
  amount: number
  subtotal: number
  shipping: number
  productIds: string[]
  status: "pending" | "approved" | "rejected" | "cancelled" | "refunded"
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

type ValidatedCheckoutProduct = {
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

async function validateCheckoutProducts(products: CreatePreferenceProduct[]) {
  const validatedProducts: ValidatedCheckoutProduct[] = []
  const sellerConnectionCache = new Map<string, boolean>()

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
    // Fase 3: comisión 8% vía marketplace_fee (comprador paga precio publicado)
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
  }

  return validatedProducts
}

function resolveSellerShippingCost(
  sellerId: string,
  options: {
    shippingCost?: number
    shippingBySeller?: Record<string, number>
    defaultIfMissing: number
  }
) {
  if (options.shippingBySeller && Object.prototype.hasOwnProperty.call(options.shippingBySeller, sellerId)) {
    const value = Number(options.shippingBySeller[sellerId])
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  if (options.shippingCost === undefined || options.shippingCost === null) {
    return options.defaultIfMissing
  }

  return options.shippingCost > 0 ? options.shippingCost : 0
}

async function createSellerPreferencePayment(params: {
  request: Request
  buyerId: string
  buyerEmail: string
  validatedProducts: ValidatedCheckoutProduct[]
  shippingCost: number
  shippingAddress?: ShippingAddress
  checkoutSessionId?: string | null
  paymentIndex?: number
  paymentTotal?: number
}) {
  const {
    request,
    buyerId,
    buyerEmail,
    validatedProducts,
    shippingCost,
    shippingAddress,
    checkoutSessionId = null,
    paymentIndex,
    paymentTotal,
  } = params

  const sellerIds = [...new Set(validatedProducts.map((p) => p.vendedorId))]
  if (sellerIds.length !== 1) {
    throw new Error("createSellerPreferencePayment requiere productos de un solo vendedor")
  }

  const sellerId = sellerIds[0]
  const sellerName = validatedProducts[0]?.vendedorNombre || "Vendedor"
  const subtotal = roundMoney(validatedProducts.reduce((sum, p) => sum + p.subtotal, 0))
  const totalCommission = roundMoney(validatedProducts.reduce((sum, p) => sum + p.comisionApp, 0))
  const total = roundMoney(subtotal + shippingCost)
  const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  // marketplace_fee = monto fijo a Servido; no puede ser >= total del pago
  let marketplaceFee = totalCommission
  if (marketplaceFee >= total) {
    marketplaceFee = Math.max(0, roundMoney(total - 0.01))
  }

  const sellerToken = await getMercadoPagoSellerAccessToken(sellerId)
  const preference = configureMercadoPago(sellerToken)

  const items = validatedProducts.map((product) => ({
    id: product.productoId,
    title: product.productoNombre,
    quantity: product.cantidad,
    unit_price: product.precioUnitario,
    currency_id: "ARS",
  }))

  if (shippingCost > 0) {
    items.push({
      id: "shipping_cost",
      title: "Costo de envío",
      quantity: 1,
      unit_price: shippingCost,
      currency_id: "ARS",
    })
  }

  const siteUrl = getMercadoPagoSiteUrl(request)
  const checkoutQuery =
    checkoutSessionId != null
      ? `?checkout=${encodeURIComponent(checkoutSessionId)}&purchase=${encodeURIComponent(purchaseId)}`
      : ""

  const preferenceData: Record<string, any> = {
    items,
    back_urls: {
      success: `${siteUrl}/purchase/success${checkoutQuery}`,
      failure: `${siteUrl}/purchase/failure${checkoutQuery}`,
      pending: `${siteUrl}/purchase/pending${checkoutQuery}`,
    },
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
    external_reference: purchaseId,
    payer: {
      email: buyerEmail,
    },
    metadata: {
      type: "product",
      billing_mode: "seller_account_with_fee",
      seller_id: sellerId,
      buyer_id: buyerId,
      checkout_session_id: checkoutSessionId,
      payment_index: paymentIndex ?? null,
      payment_total: paymentTotal ?? null,
      marketplace_fee: marketplaceFee,
      commission_rate: COMMISSION_RATE,
    },
  }

  // Fase 3: comisión automática a la cuenta de la app (Servido)
  if (marketplaceFee > 0) {
    preferenceData.marketplace_fee = marketplaceFee
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
    shippingCost,
    finalTotal: total,
    comisionTotal: totalCommission,
    marketplaceFee,
    status: "pending",
    createdAt: serverTimestamp(),
    preferenceId: result.id,
    externalReference: purchaseId,
    shippingAddress: shippingAddress || null,
    sellerId,
    billingMode: "seller_account_with_fee",
    checkoutSessionId: checkoutSessionId || null,
  })

  batch.set(doc(db, "centralizedPurchases", purchaseId), {
    id: purchaseId,
    compradorId: buyerId,
    fecha: new Date().toISOString(),
    items: validatedProducts,
    total,
    comisionTotal: totalCommission,
    marketplaceFee,
    estadoPago: "pendiente",
    estadoEnvio: "pendiente",
    mediosPago: "mercadopago",
    mercadoPagoPaymentId: "",
    shippingAddress: shippingAddress || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    preferenceId: result.id,
    externalReference: purchaseId,
    sellerId,
    billingMode: "seller_account_with_fee",
    checkoutSessionId: checkoutSessionId || null,
    marketplaceFeeApplied: marketplaceFee > 0,
    commissionRate: COMMISSION_RATE,
  })

  await batch.commit()

  logMercadoPagoEvent("info", "create_seller_preference_success", {
    purchaseId,
    buyerId,
    sellerId,
    checkoutSessionId,
    itemCount: validatedProducts.length,
    subtotal,
    shipping: shippingCost,
    total,
    marketplaceFee,
    commissionRate: COMMISSION_RATE,
  })

  return {
    sellerId,
    sellerName,
    purchaseId,
    preferenceId: result.id || null,
    init_point: result.init_point || null,
    sandbox_init_point: result.sandbox_init_point || result.init_point || null,
    amount: total,
    subtotal,
    shipping: shippingCost,
    marketplaceFee,
    productIds: validatedProducts.map((p) => p.productoId),
    status: "pending" as const,
    totals: {
      subtotal,
      shipping: shippingCost,
      final: total,
      commission: totalCommission,
    },
  }
}

/**
 * Crea preferencia(s) de cobro.
 * - 1 vendedor → un solo pago a su cuenta MP
 * - N vendedores → sesión de checkout con un pago independiente por vendedor
 */
export async function createMercadoPagoProductPreference(request: Request, body: CreatePreferencePayload) {
  const { products, buyerId, buyerEmail, shippingCost, shippingBySeller, shippingAddress } = body

  if (!buyerId || !buyerEmail) {
    throw new Error("Faltan buyerId o buyerEmail")
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("El array de productos es inválido o está vacío")
  }

  await requireAuthenticatedUser(request, buyerId)

  const validatedProducts = await validateCheckoutProducts(products)
  const productsBySeller = new Map<string, ValidatedCheckoutProduct[]>()
  for (const product of validatedProducts) {
    const list = productsBySeller.get(product.vendedorId) || []
    list.push(product)
    productsBySeller.set(product.vendedorId, list)
  }

  // Un solo vendedor: un pago
  if (productsBySeller.size === 1) {
    const [sellerId, sellerProducts] = [...productsBySeller.entries()][0]
    const sellerShipping = resolveSellerShippingCost(sellerId, {
      shippingCost,
      shippingBySeller,
      defaultIfMissing: 500,
    })

    const payment = await createSellerPreferencePayment({
      request,
      buyerId,
      buyerEmail,
      validatedProducts: sellerProducts,
      shippingCost: sellerShipping,
      shippingAddress,
    })

    return {
      mode: "single_seller" as const,
      id: payment.preferenceId,
      init_point: payment.init_point,
      sandbox_init_point: payment.sandbox_init_point,
      purchaseId: payment.purchaseId,
      sellerId: payment.sellerId,
      sellerName: payment.sellerName,
      totals: payment.totals,
    }
  }

  // Multi-vendedor: N pagos independientes
  const sessionId = `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const payments: CheckoutSellerPayment[] = []

  for (const [sellerId, sellerProducts] of productsBySeller.entries()) {
    const sellerShipping = resolveSellerShippingCost(sellerId, {
      shippingCost: undefined,
      shippingBySeller,
      // En multi no aplicamos $500 fantasma a cada vendedor si no viene envío
      defaultIfMissing: 0,
    })

    // Si el cliente mandó un shippingCost global y no shippingBySeller, repartir 0
    // (el carrito ya calcula por ítem/vendedor en el cliente).
    const payment = await createSellerPreferencePayment({
      request,
      buyerId,
      buyerEmail,
      validatedProducts: sellerProducts,
      shippingCost: sellerShipping,
      shippingAddress,
      checkoutSessionId: sessionId,
      paymentIndex: payments.length + 1,
      paymentTotal: productsBySeller.size,
    })

    payments.push({
      sellerId: payment.sellerId,
      sellerName: payment.sellerName,
      purchaseId: payment.purchaseId,
      preferenceId: payment.preferenceId,
      init_point: payment.init_point,
      sandbox_init_point: payment.sandbox_init_point,
      amount: payment.amount,
      subtotal: payment.subtotal,
      shipping: payment.shipping,
      productIds: payment.productIds,
      status: "pending",
    })
  }

  const nextPayment = payments.find((p) => p.init_point) || payments[0]

  await setDoc(doc(db, "checkoutSessions", sessionId), {
    id: sessionId,
    buyerId,
    buyerEmail,
    shippingAddress: shippingAddress || null,
    sellerCount: payments.length,
    payments,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  logMercadoPagoEvent("info", "create_multi_seller_checkout_success", {
    sessionId,
    buyerId,
    sellerCount: payments.length,
    purchaseIds: payments.map((p) => p.purchaseId),
  })

  return {
    mode: "multi_seller" as const,
    sessionId,
    sellerCount: payments.length,
    payments,
    nextPayment,
    // Compat con clientes que solo leen init_point
    id: nextPayment?.preferenceId || null,
    init_point: nextPayment?.init_point || null,
    sandbox_init_point: nextPayment?.sandbox_init_point || null,
    purchaseId: nextPayment?.purchaseId || null,
    totals: {
      subtotal: roundMoney(payments.reduce((sum, p) => sum + p.subtotal, 0)),
      shipping: roundMoney(payments.reduce((sum, p) => sum + p.shipping, 0)),
      final: roundMoney(payments.reduce((sum, p) => sum + p.amount, 0)),
    },
  }
}

export async function getCheckoutSession(sessionId: string) {
  if (!sessionId) {
    throw new Error("sessionId requerido")
  }

  const snap = await getDoc(doc(db, "checkoutSessions", sessionId))
  if (!snap.exists()) {
    throw new Error("Sesión de checkout no encontrada")
  }

  return { id: snap.id, ...(snap.data() as any) }
}

export async function markCheckoutSessionPurchaseStatus(
  checkoutSessionId: string | null | undefined,
  purchaseId: string,
  status: "approved" | "pending" | "rejected" | "cancelled" | "refunded"
) {
  if (!checkoutSessionId) return

  const sessionRef = doc(db, "checkoutSessions", checkoutSessionId)
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef)
    if (!snap.exists()) return

    const data = snap.data() as any
    const payments: CheckoutSellerPayment[] = Array.isArray(data.payments) ? [...data.payments] : []
    const index = payments.findIndex((p) => p.purchaseId === purchaseId)
    if (index === -1) return

    payments[index] = {
      ...payments[index],
      status,
    }

    const allApproved = payments.every((p) => p.status === "approved")
    const anyPending = payments.some((p) => p.status === "pending")
    const sessionStatus = allApproved ? "completed" : anyPending ? "pending" : "partial"

    transaction.set(
      sessionRef,
      {
        payments,
        status: sessionStatus,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  })
}

async function syncCheckoutSessionForPurchase(
  purchaseId: string,
  status: "approved" | "pending" | "rejected" | "cancelled" | "refunded"
) {
  try {
    const pendingSnap = await getDoc(doc(db, "pending_purchases", purchaseId))
    const centralizedSnap = pendingSnap.exists()
      ? null
      : await getDoc(doc(db, "centralizedPurchases", purchaseId))
    const data = pendingSnap.exists()
      ? (pendingSnap.data() as any)
      : centralizedSnap?.exists()
        ? (centralizedSnap.data() as any)
        : null

    const checkoutSessionId = data?.checkoutSessionId || null
    if (!checkoutSessionId) return

    await markCheckoutSessionPurchaseStatus(checkoutSessionId, purchaseId, status)
  } catch (err) {
    console.error("syncCheckoutSessionForPurchase failed:", err)
  }
}

async function fetchMercadoPagoPayment(paymentId: string, accessTokenOverride?: string) {
  const accessToken = accessTokenOverride || process.env.MERCADOPAGO_ACCESS_TOKEN
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

async function resolveSellerAccessTokenFromMpUserId(mpUserId: string | number | null | undefined) {
  if (mpUserId == null || mpUserId === "") return null
  const target = String(mpUserId)
  try {
    const { collection, getDocs, query, where, limit } = await import("firebase/firestore")
    // Prefer top-level account id used by our OAuth save
    let snap = await getDocs(query(collection(db, "users"), where("mercadopagoAccountId", "==", target), limit(1)))
    if (snap.empty) {
      snap = await getDocs(query(collection(db, "users"), where("mercadopagoUserId", "==", target), limit(1)))
    }
    if (snap.empty) {
      // user_id se guarda como string en mercadopago.user_id
      snap = await getDocs(
        query(collection(db, "users"), where("mercadopago.user_id", "==", target), limit(1))
      )
    }
    if (snap.empty) return null
    const { getMercadoPagoSellerAccessToken } = await import("@/lib/mercadopago-oauth")
    return await getMercadoPagoSellerAccessToken(snap.docs[0].id)
  } catch (err) {
    console.error("resolveSellerAccessTokenFromMpUserId failed:", err)
    return null
  }
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

    const billingMode = sourceData?.billingMode || "seller_account_with_fee"
    const paidDirectlyToSeller =
      billingMode === "seller_account" || billingMode === "seller_account_with_fee"

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
      paidToSellers: paidDirectlyToSeller,
      billingMode,
      checkoutSessionId: sourceData?.checkoutSessionId || null,
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
      paidToSellers: paidDirectlyToSeller,
      billingMode,
      checkoutSessionId: sourceData?.checkoutSessionId || null,
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
  const { handleLegacySubscriptionPayment } = await import("@/lib/mercadopago-subscriptions")
  return handleLegacySubscriptionPayment(externalReference, paymentInfo)
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

function resolveWebhookEventType(request: Request, payload: any) {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get("type") || url.searchParams.get("topic")
  const raw = String(
    payload?.type || payload?.topic || payload?.action || fromQuery || "payment"
  ).toLowerCase()

  if (raw.includes("subscription_preapproval") || raw === "subscription_preapproval") {
    return "subscription_preapproval"
  }
  if (raw.includes("subscription_authorized_payment") || raw === "subscription_authorized_payment") {
    return "subscription_authorized_payment"
  }
  if (raw.includes("preapproval") && !raw.includes("plan")) {
    return "subscription_preapproval"
  }
  return raw || "payment"
}

export async function handleMercadoPagoWebhook(request: Request): Promise<WebhookResponse> {
  const payload = await request.json().catch(() => ({}))
  const url = new URL(request.url)
  const paymentId =
    payload?.data?.id ||
    payload?.data?.payment_id ||
    payload?.id ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id")

  const eventType = resolveWebhookEventType(request, payload)

  if (!paymentId) {
    logMercadoPagoEvent("warn", "webhook_invalid_payload", {
      reason: "missing_resource_id",
      eventType,
    })
    return {
      status: 400,
      body: { received: false, handled: false, error: "id de recurso requerido" },
    }
  }

  // Suscripciones recurrentes (PreApproval / authorized payments)
  if (eventType === "subscription_preapproval" || eventType === "subscription_authorized_payment") {
    try {
      const {
        fetchMercadoPagoPreapproval,
        fetchMercadoPagoAuthorizedPayment,
        syncSubscriptionFromPreapproval,
        syncSubscriptionFromAuthorizedPayment,
      } = await import("@/lib/mercadopago-subscriptions")

      if (eventType === "subscription_preapproval") {
        const preapproval = await fetchMercadoPagoPreapproval(String(paymentId))
        const result = await syncSubscriptionFromPreapproval(preapproval)
        logMercadoPagoEvent("info", "webhook_subscription_preapproval", {
          paymentId: String(paymentId),
          eventType,
          ...result,
        })
        return {
          status: 200,
          body: { received: true, handled: true, type: "subscription_preapproval", ...result },
        }
      }

      const authorizedPayment = await fetchMercadoPagoAuthorizedPayment(String(paymentId))
      const result = await syncSubscriptionFromAuthorizedPayment(authorizedPayment)
      logMercadoPagoEvent("info", "webhook_subscription_authorized_payment", {
        paymentId: String(paymentId),
        eventType,
        ...result,
      })
      return {
        status: 200,
        body: { received: true, handled: true, type: "subscription_authorized_payment", ...result },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error procesando suscripción"
      logMercadoPagoEvent("error", "webhook_subscription_failed", {
        paymentId: String(paymentId),
        eventType,
        error: errorMessage,
      })
      return {
        status: 500,
        body: { received: false, handled: false, error: errorMessage },
      }
    }
  }

  let paymentInfo: any

  try {
    paymentInfo = await fetchMercadoPagoPayment(String(paymentId))
  } catch (platformError) {
    // Cobros con token del vendedor/restaurante: intentar con el user_id del collector
    const mpUserId = payload?.user_id ?? payload?.userId ?? null
    const sellerToken = await resolveSellerAccessTokenFromMpUserId(mpUserId)
    if (!sellerToken) {
      const errorMessage = platformError instanceof Error ? platformError.message : "Error consultando pago"
      logMercadoPagoEvent("error", "webhook_payment_fetch_failed", {
        paymentId: String(paymentId),
        error: errorMessage,
        mpUserId,
      })
      return {
        status: 502,
        body: { received: false, handled: false, error: "No se pudo consultar el pago" },
      }
    }
    try {
      paymentInfo = await fetchMercadoPagoPayment(String(paymentId), sellerToken)
    } catch (sellerError) {
      const errorMessage = sellerError instanceof Error ? sellerError.message : "Error consultando pago"
      logMercadoPagoEvent("error", "webhook_payment_fetch_failed_seller", {
        paymentId: String(paymentId),
        error: errorMessage,
        mpUserId,
      })
      return {
        status: 502,
        body: { received: false, handled: false, error: "No se pudo consultar el pago" },
      }
    }
  }

  const externalReference = String(paymentInfo.external_reference || "")
  const status = normalizePaymentStatus(paymentInfo.status)
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
        await syncCheckoutSessionForPurchase(externalReference, "approved")
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
        await syncCheckoutSessionForPurchase(externalReference, "pending")
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
        await syncCheckoutSessionForPurchase(externalReference, status)
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
        await syncCheckoutSessionForPurchase(externalReference, "refunded")
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

    if (externalReference.startsWith("food_")) {
      const { updateFoodOrderPaymentStatus } = await import("@/lib/food-order-server")
      if (status === "approved") {
        await updateFoodOrderPaymentStatus(externalReference, "approved", String(paymentId))
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        return {
          status: 200,
          body: { received: true, handled: true, type: "food", status, duplicate: false },
        }
      }
      if (status === "pending") {
        await updateFoodOrderPaymentStatus(externalReference, "pending", String(paymentId))
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        return {
          status: 200,
          body: { received: true, handled: true, type: "food", status, duplicate: false },
        }
      }
      if (status === "rejected" || status === "cancelled") {
        await updateFoodOrderPaymentStatus(externalReference, status === "rejected" ? "rejected" : "cancelled", String(paymentId))
        await markWebhookEventProcessed(reservation.eventRef, status, externalReference)
        return {
          status: 200,
          body: { received: true, handled: true, type: "food", status, duplicate: false },
        }
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
