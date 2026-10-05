"use client"

import Image from "next/image"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  BuyerDashboardShell,
  type BuyerDashboardTab,
} from "@/components/dashboard/buyer/buyer-dashboard-shell"
import { ResellerDashboardPanel } from "@/components/reseller/reseller-dashboard-panel"
import { OpenStorePanel } from "@/components/dashboard/buyer/open-store-panel"
import { QuickPublishProductPanel } from "@/components/dashboard/buyer/quick-publish-product-panel"
import { BuyerDashboardTabs } from "@/components/dashboard/buyer/buyer-dashboard-tabs"
import { BuyerAdvancedStats } from "@/components/dashboard/advanced-stats/buyer-advanced-stats"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { doc, collection, query, where, getDocs, deleteDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { PurchaseWithShipping } from "@/types/shipping"
import { getBuyerPurchases } from "@/lib/centralized-payments-api"
import type { CentralizedPurchase, PurchaseItem } from "@/types/centralized-payments"
import * as XLSX from "xlsx"
import { usePriceFormat } from "@/hooks/use-price-format"
import { startProductListingChat } from "@/lib/chat-start"
import { chatHref } from "@/lib/routes"


// Mantenemos la interface Purchase original para compatibilidad
interface Purchase {
  id: string
  paymentId: string
  productId: string
  vendedorId: string
  buyerId: string
  amount: number
  status: "approved" | "pending" | "rejected" | "cancelled"
  type: string
  createdAt: any
  // Datos del producto (obtenidos mediante join)
  productName?: string
  productDescription?: string
  productImageUrl?: string
  productIsService?: boolean
  // Datos del vendedor (obtenidos mediante join)
  vendorName?: string
}

interface Order {
  id: string
  products: OrderProduct[]
  total: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  createdAt: any
  address?: string
}

interface OrderProduct {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

interface FavoriteProduct {
  id: string // This is the favorite document ID
  productId: string // This is the actual product ID
  name: string
  price: number
  imageUrl?: string
  media?: any[]
  addedAt: any
}

// 1. Definir el tipo para cada producto comprado
interface CompraProductoBuyer {
  compraId: string;
  paymentId: string;
  fechaCompra: string;
  estadoPago: string;
  buyerId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  vendedorId: string;
  vendedorNombre: string;
  vendedorEmail: string;
  isService: boolean;
  shippingStatus?: string;
  shippingTracking?: string;
  shippingCarrier?: string;
  productImageUrl?: string;
}

export default function BuyerDashboardPage() {
  const { formatPriceNumber } = usePriceFormat()
  const td = useTranslations("buyerDashboard")
  const { toast } = useToast()
  const { currentUser, authLoading, handleLogout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<BuyerDashboardTab>("dashboard")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (
      tab === "orders" ||
      tab === "claims" ||
      tab === "purchases" ||
      tab === "appointments" ||
      tab === "favorites" ||
      tab === "reseller" ||
      tab === "openStore" ||
      tab === "publishProduct" ||
      tab === "becomeCadete" ||
      tab === "stats" ||
      tab === "profile" ||
      tab === "dashboard"
    ) {
      setActiveTab(tab)
    }
  }, [searchParams])
  const [orders, setOrders] = useState<Order[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [purchasesWithShipping, setPurchasesWithShipping] = useState<PurchaseWithShipping[]>([])
  const [centralizedPurchases, setCentralizedPurchases] = useState<CentralizedPurchase[]>([])
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  // 2. Estado para productos comprados
  const [productosComprados, setProductosComprados] = useState<CompraProductoBuyer[]>([])
  // 2. Definir rowsPerPage y page para la paginación
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role === "seller") {
      const tab = searchParams.get("tab")
      // Permitir publicación rápida / tienda desde la cuenta sin expulsar al panel vendedor.
      if (tab !== "publishProduct" && tab !== "openStore") {
        router.push("/dashboard/seller")
        return
      }
    }
    if (currentUser?.role === "cadete") {
      router.push("/dashboard/cadete")
      return
    }
    if (currentUser) {
      console.log("Current user UID:", currentUser.firebaseUser.uid)
      fetchBuyerData(currentUser.firebaseUser.uid)
    }
  }, [currentUser, authLoading, router, searchParams])

  const fetchBuyerData = async (userId: string) => {
    setLoadingData(true)
    setError(null)
    try {
      // Obtener todas las compras del usuario
      const purchasesQuery = query(
        collection(db, "purchases"),
        where("buyerId", "==", userId)
      )
      const purchaseSnapshot = await getDocs(purchasesQuery)
      const purchases = purchaseSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      // Obtener usuarios y productos para enriquecer
      const usersSnap = await getDocs(collection(db, 'users'))
      const users: Record<string, any> = {}
      usersSnap.forEach(doc => { users[doc.id] = doc.data() })
      const productsSnap = await getDocs(collection(db, 'products'))
      const products: Record<string, any> = {}
      productsSnap.forEach(doc => { products[doc.id] = doc.data() })
      // Desglosar productos de cada compra
      const productos: CompraProductoBuyer[] = purchases.flatMap((compra: any) => {
        if (!Array.isArray(compra.products)) return []
        return compra.products.map((prod: any) => {
          return {
            compraId: compra.id || '',
            paymentId: compra.paymentId || '',
            fechaCompra: compra.createdAt?.toDate?.() ? compra.createdAt.toDate().toISOString() : (typeof compra.createdAt === 'string' ? compra.createdAt : ''),
            estadoPago: compra.status || '',
            buyerId: compra.buyerId || '',
            productId: prod.productId || '',
            productName: prod.nombre || products[prod.productId]?.name || '',
            productPrice: prod.precio || products[prod.productId]?.price || 0,
            quantity: prod.quantity || 0,
            vendedorId: prod.vendedorId || '',
            vendedorNombre: users[prod.vendedorId]?.name || '',
            vendedorEmail: users[prod.vendedorId]?.email || '',
            isService: prod.isService || products[prod.productId]?.isService || false,
            shippingStatus: prod.shippingStatus || 'pendiente',
            shippingTracking: prod.shippingTracking || '',
            shippingCarrier: prod.shippingCarrier || '',
            productImageUrl: prod.imageUrl || products[prod.productId]?.imageUrl || '',
          }
        })
      })
      setProductosComprados(productos)

      // Obtener compras centralizadas
      try {
        const centralizedPurchasesData = await getBuyerPurchases(userId)
        setCentralizedPurchases(centralizedPurchasesData)
        console.log("Centralized purchases found:", centralizedPurchasesData.length)
      } catch (error) {
        console.error("Error fetching centralized purchases:", error)
        setCentralizedPurchases([])
      }

      // Fetch real favorites from Firestore
      const favoritesQuery = query(
        collection(db, "favorites"),
        where("userId", "==", userId)
      )
      const favoriteSnapshot = await getDocs(favoritesQuery)
      const favoritesData = favoriteSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FavoriteProduct)
      
      // Ordenar favoritos por fecha de agregado (más reciente primero)
      favoritesData.sort((a, b) => {
        const dateA = a.addedAt?.toDate ? a.addedAt.toDate() : 
                     a.addedAt?.seconds ? new Date(a.addedAt.seconds * 1000) : 
                     new Date(a.addedAt)
        const dateB = b.addedAt?.toDate ? b.addedAt.toDate() : 
                     b.addedAt?.seconds ? new Date(b.addedAt.seconds * 1000) : 
                     new Date(b.addedAt)
        return dateB.getTime() - dateA.getTime()
      })
      
      setFavorites(favoritesData)
    } catch (err) {
      console.error("Error fetching buyer data:", err)
      if (err instanceof Error) {
        setError(td("loadPurchasesErrorDetail", { message: err.message }))
      } else {
      setError(td("loadPurchasesError"))
      }
    } finally {
      setLoadingData(false)
    }
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!window.confirm(td("removeFavoriteConfirm"))) {
      return
    }
    try {
      await deleteDoc(doc(db, "favorites", favoriteId))
      setFavorites((prevFavorites) => prevFavorites.filter((fav) => fav.id !== favoriteId))
      setSuccessMessage(td("favoriteRemoved"))
    } catch (err) {
      console.error("Error removing favorite:", err)
      setError(td("favoriteRemoveError"))
    }
  }

  const handleChatWithSeller = async (purchase: CompraProductoBuyer) => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    try {
      const buyerName =
        currentUser.name ||
        currentUser.firebaseUser.displayName ||
        currentUser.firebaseUser.email?.split("@")[0] ||
        "Comprador"
      const chatId = await startProductListingChat({
        productId: purchase.productId,
        productName: purchase.productName,
        productImageUrl: purchase.productImageUrl,
        buyerId: currentUser.firebaseUser.uid,
        buyerName,
        sellerId: purchase.vendedorId,
        sellerName: purchase.vendedorNombre || "Vendedor",
        initialMessage: purchase.isService
          ? "¡Hola! Quisiera consultar sobre el servicio que compré."
          : "¡Hola! Quisiera consultar sobre mi compra.",
      })
      router.push(chatHref(chatId))
    } catch (error) {
      console.error("Error opening seller chat:", error)
      toast({
        title: td("errorTitle"),
        description: "No se pudo abrir el chat. Intentá nuevamente.",
        variant: "destructive",
      })
    }
  }

  // Confirmar entrega del producto
  const handleConfirmDelivery = async (purchase: CompraProductoBuyer) => {
    if (!currentUser) {
      setError(td("deliveryLoginRequired"))
      return
    }

    if (!window.confirm(td("deliveryConfirm"))) {
      return
    }

    try {
      setLoadingData(true)
      setError(null)

      // Buscar la compra en la colección purchases
      const purchaseRef = doc(db, "purchases", purchase.compraId)
      const purchaseDoc = await getDoc(purchaseRef)

      if (!purchaseDoc.exists()) {
        setError(td("purchaseNotFound"))
        return
      }

      const purchaseData = purchaseDoc.data()
      
      // Buscar el producto específico en la compra
      if (purchaseData.products && Array.isArray(purchaseData.products)) {
        const productIndex = purchaseData.products.findIndex(
          (prod: any) => prod.productId === purchase.productId
        )

        if (productIndex !== -1) {
          // Actualizar el estado de envío del producto específico
          const updatedProducts = [...purchaseData.products]
          updatedProducts[productIndex] = {
            ...updatedProducts[productIndex],
            shippingStatus: 'entregado',
            shippingUpdatedAt: serverTimestamp(),
            shippingUpdatedBy: currentUser.firebaseUser.uid
          }

          // Actualizar el documento de la compra
          await updateDoc(purchaseRef, {
            products: updatedProducts
          })

          // Actualizar el estado local
          setProductosComprados(prev => 
            prev.map(p => 
              p.compraId === purchase.compraId && p.productId === purchase.productId
                ? { ...p, shippingStatus: 'entregado' }
                : p
            )
          )

          setSuccessMessage(td("deliverySuccess"))
        } else {
          setError(td("productNotInPurchase"))
        }
      } else {
        setError(td("invalidPurchaseStructure"))
      }
    } catch (err) {
      console.error("Error confirming delivery:", err)
      if (err instanceof Error) {
        setError(td("deliveryErrorDetail", { message: err.message }))
      } else {
        setError(td("deliveryError"))
      }
    } finally {
      setLoadingData(false)
    }
  }

  // 🆕 NUEVA FUNCIÓN: Verificar si se puede confirmar la entrega
  const canConfirmDelivery = (purchase: CompraProductoBuyer) => {
    // Solo se puede confirmar si:
    // 1. No es un servicio
    // 2. El estado de envío es "enviado"
    // 3. El pago está aprobado
    return !purchase.isService && 
           purchase.shippingStatus === 'enviado' && 
           purchase.estadoPago === 'pagado'
  }

  // 🆕 NUEVA FUNCIÓN: Confirmar entrega para compras centralizadas
  const handleConfirmDeliveryCentralized = async (purchaseId: string, item: PurchaseItem) => {
    if (!currentUser) {
      setError(td("deliveryLoginRequired"))
      return
    }

    if (!window.confirm(td("deliveryConfirm"))) {
      return
    }

    try {
      setLoadingData(true)
      setError(null)

      // Buscar la compra centralizada
      const purchaseRef = doc(db, "centralizedPurchases", purchaseId)
      const purchaseDoc = await getDoc(purchaseRef)

      if (!purchaseDoc.exists()) {
        setError(td("centralizedNotFound"))
        return
      }

      const purchaseData = purchaseDoc.data()
      
      // Buscar el producto específico en la compra centralizada
      const productIndex = purchaseData.items.findIndex(
        (prod: PurchaseItem) => prod.productoId === item.productoId
      )

      if (productIndex !== -1) {
        // Actualizar el estado de envío del producto específico
        const updatedItems = [...purchaseData.items]
        updatedItems[productIndex] = {
          ...updatedItems[productIndex],
          shippingStatus: 'entregado',
          shippingUpdatedAt: serverTimestamp(),
          shippingUpdatedBy: currentUser.firebaseUser.uid
        }

        // Actualizar el documento de la compra centralizada
        await updateDoc(purchaseRef, {
          items: updatedItems
        })

        // Actualizar el estado local
        setCentralizedPurchases(prev => 
          prev.map(p => 
            p.id === purchaseId 
              ? { ...p, items: updatedItems }
              : p
          )
        )

        setSuccessMessage(td("deliverySuccess"))
      } else {
        setError(td("productNotInCentralized"))
      }
    } catch (err) {
      console.error("Error confirming delivery centralized:", err)
      if (err instanceof Error) {
        setError(td("deliveryErrorDetail", { message: err.message }))
      } else {
        setError(td("deliveryError"))
      }
    } finally {
      setLoadingData(false)
    }
  }

  // Paginación
  const totalPages = Math.ceil(productosComprados.length / rowsPerPage)
  const paginatedPurchases = productosComprados.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // Exportar a Excel
  const handleExportExcel = () => {
    const data = productosComprados.map(p => ({
      [td("excelColId")]: p.compraId,
      [td("excelColDate")]: p.fechaCompra,
      [td("excelColBuyer")]: p.buyerId,
      [td("excelColSeller")]: p.vendedorNombre,
      [td("excelColProduct")]: p.productName,
      [td("excelColQty")]: p.quantity,
      [td("excelColUnitPrice")]: formatPriceNumber(p.productPrice),
      [td("excelColSubtotal")]: formatPriceNumber(p.productPrice * p.quantity),
      [td("excelColPaymentStatus")]: p.estadoPago,
      [td("excelColShippingStatus")]: p.shippingStatus,
      [td("excelColTracking")]: p.shippingTracking,
      [td("excelColCarrier")]: p.shippingCarrier,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, td("excelSheetPurchases"))
    XLSX.writeFile(wb, td("excelFileName"))
  }

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/40">
        <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
      </div>
    )
  }

  return (
    <BuyerDashboardShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName={currentUser?.firebaseUser?.displayName || currentUser?.firebaseUser?.email?.split("@")[0]}
      userPhoto={currentUser?.photoURL}
      onLogout={handleLogout}
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuOpenChange={setIsMobileMenuOpen}
    >
      {error && (
        <Alert variant="destructive" className="mb-4 rounded-2xl">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>{td("errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="mb-4 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{td("successTitle")}</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {activeTab === "dashboard" && (
        <div className="mb-5 overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5">
          <Image
            src="/images/bannernuevooficial5.jpeg"
            alt={td("bannerAlt")}
            width={1600}
            height={728}
            className="h-auto w-full"
            sizes="(max-width: 1024px) calc(100vw - 2rem), 960px"
            priority
          />
        </div>
      )}

      {activeTab === "stats" && (
        <BuyerAdvancedStats purchases={productosComprados} favoritesCount={favorites.length} />
      )}

      {activeTab === "reseller" && <ResellerDashboardPanel />}

      {activeTab === "publishProduct" && <QuickPublishProductPanel />}

      {(activeTab === "openStore" || activeTab === "becomeCadete") && (
        <OpenStorePanel
          mode={activeTab === "becomeCadete" ? "cadete" : "store"}
          onModeChange={(next) => {
            const tab =
              next === "publish" ? "publishProduct" : next === "cadete" ? "becomeCadete" : "openStore"
            setActiveTab(tab)
            router.replace(`/dashboard/buyer?tab=${tab}`)
          }}
        />
      )}

      {activeTab !== "reseller" &&
        activeTab !== "openStore" &&
        activeTab !== "publishProduct" &&
        activeTab !== "becomeCadete" &&
        activeTab !== "stats" && (
      <BuyerDashboardTabs
        activeTab={activeTab}
        loadingData={loadingData}
        productosComprados={productosComprados}
        centralizedPurchases={centralizedPurchases}
        favorites={favorites}
        paginatedPurchases={paginatedPurchases}
        totalPages={totalPages}
        page={page}
        onPageChange={setPage}
        onTabChange={setActiveTab}
        onExportExcel={handleExportExcel}
        onRemoveFavorite={handleRemoveFavorite}
        onChatWithSeller={handleChatWithSeller}
        onConfirmDelivery={handleConfirmDelivery}
        onConfirmDeliveryCentralized={handleConfirmDeliveryCentralized}
        canConfirmDelivery={canConfirmDelivery}
        buyerId={currentUser?.firebaseUser?.uid}
        currentUser={{
          displayName: currentUser?.firebaseUser?.displayName || currentUser?.firebaseUser?.email?.split("@")[0],
          email: currentUser?.firebaseUser?.email,
          photoURL: currentUser?.photoURL,
        }}
      />
      )}
    </BuyerDashboardShell>
  )
}
