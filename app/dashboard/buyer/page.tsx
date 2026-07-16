"use client"

import Image from "next/image"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  BuyerDashboardShell,
  type BuyerDashboardTab,
} from "@/components/dashboard/buyer/buyer-dashboard-shell"
import { BuyerDashboardTabs } from "@/components/dashboard/buyer/buyer-dashboard-tabs"

import { useState, useEffect, type ChangeEvent } from "react"
import { db, storage } from "@/lib/firebase"
import { doc, collection, query, where, getDocs, deleteDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { updateProfile, getAuth } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { PurchaseWithShipping } from "@/types/shipping"
import { getBuyerPurchases } from "@/lib/centralized-payments-api"
import type { CentralizedPurchase, PurchaseItem } from "@/types/centralized-payments"
import * as XLSX from "xlsx"
import { formatPriceNumber } from "@/lib/utils"


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
  const { currentUser, authLoading, handleLogout, refreshUserProfile } = useAuth() // Use useAuth hook
  const router = useRouter()
  const auth = getAuth()

  const [activeTab, setActiveTab] = useState<BuyerDashboardTab>("dashboard")
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

  // Profile Image Upload State
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<string | null>(null)
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null)
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null)

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role === "seller") {
      router.push("/dashboard/seller")
      return
    }
    if (currentUser) {
      console.log("Current user UID:", currentUser.firebaseUser.uid)
      fetchBuyerData(currentUser.firebaseUser.uid)
      // Set initial profile image preview if available
      if (currentUser.photoURL) {
        setProfileImagePreviewUrl(currentUser.photoURL)
      }
    }
  }, [currentUser, authLoading, router])

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
        setError(`Error al cargar tus compras: ${err.message}`)
      } else {
      setError("Error al cargar tus compras.")
      }
    } finally {
      setLoadingData(false)
    }
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto de tus favoritos?")) {
      return
    }
    try {
      await deleteDoc(doc(db, "favorites", favoriteId))
      setFavorites((prevFavorites) => prevFavorites.filter((fav) => fav.id !== favoriteId))
      setSuccessMessage("Producto eliminado de favoritos.")
    } catch (err) {
      console.error("Error removing favorite:", err)
      setError("Error al eliminar el producto de favoritos.")
    }
  }

  const handleChatWithSeller = async (_purchase: CompraProductoBuyer) => {
    alert("Funcionalidad de chat temporalmente deshabilitada")
  }

  // Confirmar entrega del producto
  const handleConfirmDelivery = async (purchase: CompraProductoBuyer) => {
    if (!currentUser) {
      setError("Debes iniciar sesión para confirmar la entrega.")
      return
    }

    if (!window.confirm("¿Confirmas que has recibido el producto en perfectas condiciones?")) {
      return
    }

    try {
      setLoadingData(true)
      setError(null)

      // Buscar la compra en la colección purchases
      const purchaseRef = doc(db, "purchases", purchase.compraId)
      const purchaseDoc = await getDoc(purchaseRef)

      if (!purchaseDoc.exists()) {
        setError("No se encontró la compra especificada.")
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

          setSuccessMessage("¡Entrega confirmada exitosamente! El vendedor ha sido notificado.")
        } else {
          setError("No se encontró el producto en la compra.")
        }
      } else {
        setError("Estructura de compra inválida.")
      }
    } catch (err) {
      console.error("Error confirming delivery:", err)
      if (err instanceof Error) {
        setError(`Error al confirmar la entrega: ${err.message}`)
      } else {
        setError("Error al confirmar la entrega. Inténtalo de nuevo.")
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
      setError("Debes iniciar sesión para confirmar la entrega.")
      return
    }

    if (!window.confirm("¿Confirmas que has recibido el producto en perfectas condiciones?")) {
      return
    }

    try {
      setLoadingData(true)
      setError(null)

      // Buscar la compra centralizada
      const purchaseRef = doc(db, "centralizedPurchases", purchaseId)
      const purchaseDoc = await getDoc(purchaseRef)

      if (!purchaseDoc.exists()) {
        setError("No se encontró la compra centralizada especificada.")
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

        setSuccessMessage("¡Entrega confirmada exitosamente! El vendedor ha sido notificado.")
      } else {
        setError("No se encontró el producto en la compra centralizada.")
      }
    } catch (err) {
      console.error("Error confirming delivery centralized:", err)
      if (err instanceof Error) {
        setError(`Error al confirmar la entrega: ${err.message}`)
      } else {
        setError("Error al confirmar la entrega. Inténtalo de nuevo.")
      }
    } finally {
      setLoadingData(false)
    }
  }

  // --- Profile Image Functions ---
  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImageFile(file)
      setProfileImagePreviewUrl(URL.createObjectURL(file))
      setProfileUpdateError(null)
      setProfileUpdateSuccess(null)
    }
  }

  const handleUploadProfileImage = async () => {
    if (!currentUser || !profileImageFile) {
      setProfileUpdateError("No hay imagen seleccionada o usuario no autenticado.")
      return
    }

    setUploadingProfileImage(true)
    setProfileUpdateError(null)
    setProfileUpdateSuccess(null)

    const filePath = `users/${currentUser.firebaseUser.uid}/profile.jpg` // Consistent file name
    const storageRef = ref(storage, filePath)

    try {
      // Delete previous image if it exists
      if (currentUser.photoPath) {
        const prevImageRef = ref(storage, currentUser.photoPath)
        await deleteObject(prevImageRef).catch((err) => console.warn("Error deleting old profile image:", err))
      }

      await uploadBytes(storageRef, profileImageFile)
      const downloadURL = await getDownloadURL(storageRef)

      // Update Firestore user document
      const userDocRef = doc(db, "users", currentUser.firebaseUser.uid)
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        photoPath: filePath,
      })

      // Update Firebase Auth profile (optional, but good for consistency)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL })
      }

      await refreshUserProfile() // Refresh context state
      setProfileUpdateSuccess("Foto de perfil actualizada exitosamente.")
      setProfileImageFile(null) // Clear file input
    } catch (err) {
      console.error("Error uploading profile image:", err)
      setProfileUpdateError("Error al subir la foto de perfil. Inténtalo de nuevo.")
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const handleRemoveProfileImage = async () => {
    if (!currentUser || !currentUser.photoPath) {
      setProfileUpdateError("No hay foto de perfil para eliminar.")
      return
    }

    if (!window.confirm("¿Estás seguro de que quieres eliminar tu foto de perfil?")) {
      return
    }

    setUploadingProfileImage(true) // Use this for loading state during deletion too
    setProfileUpdateError(null)
    setProfileUpdateSuccess(null)

    try {
      const imageRef = ref(storage, currentUser.photoPath)
      await deleteObject(imageRef)

      // Update Firestore user document
      const userDocRef = doc(db, "users", currentUser.firebaseUser.uid)
      await updateDoc(userDocRef, {
        photoURL: null,
        photoPath: null,
      })

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: null })
      }

      await refreshUserProfile() // Refresh context state
      setProfileImagePreviewUrl(null) // Clear preview
      setProfileUpdateSuccess("Foto de perfil eliminada exitosamente.")
    } catch (err) {
      console.error("Error removing profile image:", err)
      setProfileUpdateError("Error al eliminar la foto de perfil. Inténtalo de nuevo.")
    } finally {
      setUploadingProfileImage(false)
    }
  }
  // --- End Profile Image Functions ---

  // Paginación
  const totalPages = Math.ceil(productosComprados.length / rowsPerPage)
  const paginatedPurchases = productosComprados.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // Exportar a Excel
  const handleExportExcel = () => {
    const data = productosComprados.map(p => ({
      ID: p.compraId,
      Fecha: p.fechaCompra,
      Comprador: p.buyerId,
      Vendedor: p.vendedorNombre,
      Producto: p.productName,
      Cantidad: p.quantity,
              PrecioUnitario: formatPriceNumber(p.productPrice),
        Subtotal: formatPriceNumber(p.productPrice * p.quantity),
      EstadoPago: p.estadoPago,
      EstadoEnvio: p.shippingStatus,
      Tracking: p.shippingTracking,
      Transportista: p.shippingCarrier,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Compras")
    XLSX.writeFile(wb, "compras_usuario.xlsx")
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
      userPhoto={profileImagePreviewUrl || currentUser?.photoURL}
      onLogout={handleLogout}
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuOpenChange={setIsMobileMenuOpen}
    >
      {error && (
        <Alert variant="destructive" className="mb-4 rounded-2xl">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="mb-4 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Éxito</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {activeTab === "dashboard" && (
        <div className="mb-5 overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5">
          <Image
            src="/images/bannernuevooficial5.jpeg"
            alt="Servido Market: todo lo que necesitás"
            width={1600}
            height={728}
            className="h-auto w-full"
            sizes="(max-width: 1024px) calc(100vw - 2rem), 960px"
            priority
          />
        </div>
      )}

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
        currentUser={{
          displayName: currentUser?.firebaseUser?.displayName || currentUser?.firebaseUser?.email?.split("@")[0],
          email: currentUser?.firebaseUser?.email,
          photoURL: currentUser?.photoURL,
        }}
        profileImagePreviewUrl={profileImagePreviewUrl}
        profileImageFile={profileImageFile}
        uploadingProfileImage={uploadingProfileImage}
        profileUpdateError={profileUpdateError}
        profileUpdateSuccess={profileUpdateSuccess}
        onProfileImageChange={handleProfileImageChange}
        onUploadProfileImage={handleUploadProfileImage}
        onRemoveProfileImage={handleRemoveProfileImage}
        onCancelProfileImageSelection={() => {
          setProfileImageFile(null)
          setProfileImagePreviewUrl(currentUser?.photoURL || null)
        }}
      />
    </BuyerDashboardShell>
  )
}
