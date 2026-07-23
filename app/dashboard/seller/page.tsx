"use client"

import Link from "next/link"
import {
  ShoppingBag,
  PlusCircle,
  Edit,
  Trash2,
  XCircle,
  BarChart3,
  ListFilter,
  ImageIcon as ImageIconLucide,
  MessageSquare,
  UserIcon,
  Video,
  AlertTriangle,
  CheckCircle,
  Tag,
  LineChart,
  User,
  Clock,
  Package,
  Truck,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { useState, useEffect, type FormEvent, type ChangeEvent, type DragEvent, useMemo } from "react"
import { db, storage, auth } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  getDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
// import { ChatList } from "@/components/chat-list"
import { hasWhiteBackground, isValidVideoFile, getVideoDuration } from "@/lib/image-validation"
// import { ConnectMercadoPagoButton } from "@/components/ui/connect-mercadopago-button" // ELIMINADO
import { useToast } from "@/components/ui/use-toast"
import { ApiService } from "@/lib/services/api"
import { PaymentDateButton } from "@/components/ui/payment-date-button"
import { ShippingAddressButton } from "@/components/ui/shipping-address-button"
import { PriceFormatToggle } from "@/components/ui/price-format-toggle"
import { 
  getSellerSales, 
  calculateCommissionDistribution, 
  generateCommissionInvoice,
  getCentralizedShipmentsByVendor,
  updateCentralizedShippingStatus,
  type CommissionDistribution
} from "@/lib/centralized-payments-api"
import type { AdminSaleRecord } from "@/types/centralized-payments"
import type { 
  PurchaseWithShipping, 
  ShippingStatus, 
  ShippingUpdateRequest,
  SHIPPING_STATUS_LABELS, 
  SHIPPING_STATUS_COLORS 
} from "@/types/shipping"
import { getSellerShipments, updateShippingStatus, initializeShipping } from "@/lib/shipping"
// Los iconos ya están importados arriba
import * as XLSX from "xlsx"
import { getDashboardProductImage } from "@/lib/image-utils"
import { formatPrice, formatPriceNumber } from "@/lib/utils"
import { SubscriptionNotification } from "@/components/subscription-notification"
import { SellerBusinessLocationCard } from "@/components/dashboard/seller-business-location-card"
import {
  SellerDashboardShell,
  type SellerDashboardTab,
} from "@/components/dashboard/seller/seller-dashboard-shell"
import { BuyerStatCard } from "@/components/dashboard/buyer/buyer-stat-card"
import { BuyerPanel } from "@/components/dashboard/buyer/buyer-panel"
import { SellerAgendaPanel } from "@/components/dashboard/seller/seller-agenda-panel"
import type { ServiceSchedule } from "@/types/service-appointments"

interface UserProfile {
  uid: string
  displayName?: string | null
  email?: string | null
  role?: "user" | "seller" | "admin"
  isSubscribed?: boolean | null // Permitir que sea null o undefined
  productUploadLimit?: number
  photoURL?: string
  photoPath?: string
}

interface ProductMedia {
  type: "image" | "video"
  url: string
  path: string
  thumbnail?: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  media: ProductMedia[]
  isService: boolean
  stock?: number
  sellerId: string
  serviceSchedule?: ServiceSchedule | null
  createdAt: any
  updatedAt?: any
  couponId?: string | null
  couponStartDate?: any | null
  couponEndDate?: any | null
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

// interface ConnectionStatus - YA NO ES NECESARIA EN SISTEMA CENTRALIZADO
// interface ConnectionStatus {
//   isConnected: boolean
//   lastChecked: string
// }

interface Coupon {
  id: string
  code: string
  name: string
  description?: string | null
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  applicableTo: "all" | "sellers" | "buyers"
  startDate?: any | null
  endDate?: any | null
  isActive: boolean
  createdAt: any
}

// Función utilitaria para limpiar campos undefined, null vacíos
function cleanUndefinedFields<T extends object>(obj: T): any {
  const cleanObj: any = { ...obj }
  Object.keys(cleanObj).forEach((key) => {
    const value = cleanObj[key]
    // Eliminar campos undefined, null, o strings vacíos
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      delete cleanObj[key]
    }
  })
  return cleanObj
}

interface ProductSale {
  id: string
  buyerId: string
  createdAt: any
  needsTransfer: boolean
  paymentId: string
  productId: string
  productName: string
  productPrice: number
  purchaseId: string
  status: string
  transferStatus: string
  vendedorId: string
}
interface UserMap { [key: string]: any }
interface ProductMap { [key: string]: any }

// 1. Definir el tipo para la venta por producto del seller
interface VentaProductoSeller {
  compraId: string;
  paymentId: string;
  status: string;
  totalAmount: number;
  fechaCompra: string;
  buyerId: string;
  compradorNombre: string;
  compradorEmail: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  vendedorId: string;
  vendedorNombre: string;
  vendedorEmail: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    dni?: string;
    additionalInfo?: string;
  };
  fechaPago?: string;
}

// Helper para normalizar la fecha de compra
function getFechaCompra(compra: any): string {
  console.log('DEBUG: getFechaCompra - Input compra:', {
    createdAt: compra.createdAt,
    createdAtType: typeof compra.createdAt,
    fecha: compra.fecha,
    fechaType: typeof compra.fecha
  })
  
  // Firestore Timestamp object (nuevo formato)
  if (compra.createdAt && compra.createdAt.seconds) {
    console.log('DEBUG: Usando createdAt.seconds (Firestore):', compra.createdAt.seconds)
    return new Date(compra.createdAt.seconds * 1000).toISOString();
  }
  
  // Firestore Timestamp object (formato antiguo con _seconds)
  if (compra.createdAt && compra.createdAt._seconds) {
    console.log('DEBUG: Usando createdAt._seconds (formato antiguo):', compra.createdAt._seconds)
    return new Date(compra.createdAt._seconds * 1000).toISOString();
  }
  
  if (typeof compra.createdAt === 'string' && !isNaN(Date.parse(compra.createdAt))) {
    console.log('DEBUG: Usando createdAt como string:', compra.createdAt)
    return compra.createdAt;
  }
  if (typeof compra.fecha === 'string' && !isNaN(Date.parse(compra.fecha))) {
    console.log('DEBUG: Usando fecha como string:', compra.fecha)
    return compra.fecha;
  }
  if (typeof compra.created_at === 'string' && !isNaN(Date.parse(compra.created_at))) {
    console.log('DEBUG: Usando created_at como string:', compra.created_at)
    return compra.created_at;
  }
  if (typeof compra.createdAt === 'number') {
    console.log('DEBUG: Usando createdAt como number:', compra.createdAt)
    return new Date(compra.createdAt).toISOString();
  }
  if (typeof compra.fecha === 'number') {
    console.log('DEBUG: Usando fecha como number:', compra.fecha)
    return new Date(compra.fecha).toISOString();
  }
  
  console.log('DEBUG: No se encontró fecha válida, retornando string vacío')
  return '';
}

export default function SellerDashboardPage() {
  const { currentUser, authLoading, handleLogout, refreshUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const hasActiveSubscription = currentUser?.subscriptionStatus === "active"
  const cancelAtPeriodEnd = Boolean(currentUser?.subscriptionCancelAtPeriodEnd)
  const subscriptionRequiredMessage = "Suscripción mensual requerida para publicar productos y servicios"
  const subscriptionActiveMessage = cancelAtPeriodEnd
    ? "Suscripción activa hasta el fin del período (sin renovación)"
    : "Suscripción activa — se renueva automáticamente cada mes"
  const subscriptionBlockedMessage = "Debes activar tu suscripción mensual para publicar productos y servicios."

  const subscriptionEndsAt = currentUser?.subscriptionEndsAt ?? null
  const subscriptionDaysRemaining = currentUser?.subscriptionDaysRemaining ?? null
  const subscriptionStatusSummary = useMemo(() => {
    if (hasActiveSubscription) {
      if (cancelAtPeriodEnd && subscriptionEndsAt) {
        return `Cancelaste la renovación. Seguí operando hasta el ${format(subscriptionEndsAt, "dd/MM/yyyy")}.`
      }

      if (subscriptionEndsAt && format(subscriptionEndsAt, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) {
        return "Próximo cobro hoy (renovación automática)"
      }

      if (typeof subscriptionDaysRemaining === "number") {
        if (subscriptionDaysRemaining <= 0) {
          return "Próximo cobro hoy (renovación automática)"
        }

        if (subscriptionDaysRemaining === 1) {
          return "Próximo cobro en 1 día"
        }

        return `Próximo cobro estimado en ${subscriptionDaysRemaining} días`
      }

      return "Suscripción activa con renovación automática"
    }

    if (subscriptionEndsAt) {
      return "Tu suscripción venció o el cobro falló. Reactivala para volver a publicar."
    }

    return "Activá la suscripción mensual automática para publicar productos y servicios"
  }, [hasActiveSubscription, cancelAtPeriodEnd, subscriptionEndsAt?.getTime(), subscriptionDaysRemaining])
  const subscriptionActionLabel = subscriptionEndsAt && !hasActiveSubscription ? "Reactivar suscripción" : "Activar suscripción mensual"

  const mercadoPagoStatus = currentUser?.mercadoPagoStatus ?? "not_connected"
  const mercadoPagoConnected = mercadoPagoStatus === "connected"
  const mercadoPagoTokenExpired = mercadoPagoStatus === "token_expired"
  const mercadoPagoConnectionSummary = useMemo(() => {
    if (mercadoPagoConnected) {
      return "Tu cuenta de Mercado Pago está conectada. Cobrás el 92% de cada venta (8% comisión Servido)."
    }

    if (mercadoPagoTokenExpired) {
      return "La conexión de Mercado Pago venció. Reconecta para volver a cobrar."
    }

    return "Debes conectar tu cuenta de Mercado Pago para cobrar ventas."
  }, [mercadoPagoConnected, mercadoPagoTokenExpired])
  const mercadoPagoActionLabel = mercadoPagoConnected ? "Conectado" : mercadoPagoTokenExpired ? "Reconectar Mercado Pago" : "Conectar Mercado Pago"
  const mercadoPagoStatusLabel = mercadoPagoConnected ? "Conectado" : mercadoPagoTokenExpired ? "Token vencido" : "No conectado"
  const mercadoPagoBadgeVariant = mercadoPagoConnected ? "default" : mercadoPagoTokenExpired ? "destructive" : "secondary"

  const renderSubscriptionGate = (showActionButton = true) => (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        hasActiveSubscription ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {hasActiveSubscription ? (
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${hasActiveSubscription ? "text-emerald-800" : "text-amber-800"}`}>
            {hasActiveSubscription ? subscriptionActiveMessage : subscriptionRequiredMessage}
          </span>
          <span className={`text-xs ${hasActiveSubscription ? "text-emerald-700" : "text-amber-700"}`}>
            {subscriptionStatusSummary}
          </span>
        </div>
      </div>
      {showActionButton && !hasActiveSubscription && (
        <Button
          onClick={() => setActiveTab("profile")}
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full border-amber-300 text-amber-800 hover:bg-amber-100"
        >
          {subscriptionActionLabel}
        </Button>
      )}
    </div>
  )

  const [activeTab, setActiveTab] = useState<SellerDashboardTab>("dashboard")
  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [catalogLoadedForUid, setCatalogLoadedForUid] = useState<string | null>(null)

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [connectingMercadoPago, setConnectingMercadoPago] = useState(false)
  const [disconnectingMercadoPago, setDisconnectingMercadoPago] = useState(false)

  // Product Form State
  const [isEditing, setIsEditing] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productCategory, setProductCategory] = useState("")
  const [productBrand, setProductBrand] = useState("")

  // Media Upload State (for products)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([])
  const [currentProductMedia, setCurrentProductMedia] = useState<ProductMedia[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [validatingImages, setValidatingImages] = useState(false)
  const [mediaValidationErrors, setMediaValidationErrors] = useState<string[]>([])

  const [submittingProduct, setSubmittingProduct] = useState(false)

  const [productIsService, setProductIsService] = useState(false)
  const [productStock, setProductStock] = useState("")
  
  // Estados para condición y envío del producto
  const [productCondition, setProductCondition] = useState<'nuevo' | 'usado'>('nuevo')
  const [freeShipping, setFreeShipping] = useState(false)
  const [shippingCost, setShippingCost] = useState("")

  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Profile picture states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<string | null>(null)
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)

  // Earnings and payments states
  const [sellerSales, setSellerSales] = useState<AdminSaleRecord[]>([])
  const [commissionDistribution, setCommissionDistribution] = useState<CommissionDistribution | null>(null)
  const [loadingEarnings, setLoadingEarnings] = useState(false)
  const [earningsLoadedForUid, setEarningsLoadedForUid] = useState<string | null>(null)
  const [earningsFilter, setEarningsFilter] = useState<'all' | 'pendiente' | 'pagado'>('all')
  const [earningsDateFrom, setEarningsDateFrom] = useState('')
  const [earningsDateTo, setEarningsDateTo] = useState('')

  // Estado para conexión MercadoPago - YA NO ES NECESARIO EN SISTEMA CENTRALIZADO
  // const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  // const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Shipping management state
  const [shipments, setShipments] = useState<PurchaseWithShipping[]>([])
  const [centralizedShipments, setCentralizedShipments] = useState<any[]>([])
  const [loadingShipments, setLoadingShipments] = useState(false)
  const [shippingFilter, setShippingFilter] = useState<ShippingStatus | "all">("all")
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null)
  
  // Shipping update modal state
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false)
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [selectedNewStatus, setSelectedNewStatus] = useState<ShippingStatus | null>(null)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [carrierName, setCarrierName] = useState("")
  const [shippingNotes, setShippingNotes] = useState("")

  // 1. Añadir estado para la pestaña activa de añadir: producto o servicio
  const [activeAddTab, setActiveAddTab] = useState<'product' | 'service'>('product')

  // 1. Añadir estado para controlar el loading de suscripción
  const [subscribing, setSubscribing] = useState(false)
  const [cancellingSubscription, setCancellingSubscription] = useState(false)
  
  // Estado para notificación de suscripción
  const [subscriptionNotification, setSubscriptionNotification] = useState<{
    show: boolean
    status: 'success' | 'failure'
  }>({ show: false, status: 'success' })

  // Estado para gestión de cupones
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [couponApplyStartDate, setCouponApplyStartDate] = useState<Date | undefined>(undefined)
  const [couponApplyEndDate, setCouponApplyEndDate] = useState<Date | undefined>(undefined)
  const [associatingCoupon, setAssociatingCoupon] = useState(false)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  
  // Estado para precio de suscripción
  const [subscriptionPrice, setSubscriptionPrice] = useState<number | null>(null)
  const [loadingSubscriptionPrice, setLoadingSubscriptionPrice] = useState(false)

  // Estados para creación de cupones propios
  const [myCoupons, setMyCoupons] = useState<Coupon[]>([])
  const [newCouponCode, setNewCouponCode] = useState("")
  const [newCouponName, setNewCouponName] = useState("")
  const [newCouponDescription, setNewCouponDescription] = useState("")
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [newCouponDiscountValue, setNewCouponDiscountValue] = useState("")
  const [newCouponMinPurchase, setNewCouponMinPurchase] = useState("")
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState("")
  const [newCouponUsageLimit, setNewCouponUsageLimit] = useState("")
  const [newCouponStartDate, setNewCouponStartDate] = useState<Date | undefined>(undefined)
  const [newCouponEndDate, setNewCouponEndDate] = useState<Date | undefined>(undefined)
  const [creatingCoupon, setCreatingCoupon] = useState(false)

  // Estados para validación visual de formularios
  const [productFormErrors, setProductFormErrors] = useState<{[key:string]:string}>({})
  const [serviceFormErrors, setServiceFormErrors] = useState<{[key:string]:string}>({})
  const [productFormTouched, setProductFormTouched] = useState(false)
  const [serviceFormTouched, setServiceFormTouched] = useState(false)

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 2. Cambiar el estado de ventas
  const [sales, setSales] = useState<VentaProductoSeller[]>([])
  const [usersMap, setUsersMap] = useState<UserMap>({})
  const [productsMap, setProductsMap] = useState<ProductMap>({})
  const [loadingSales, setLoadingSales] = useState(true)
  const [filters, setFilters] = useState({
    estado: 'all',
    producto: '',
    comprador: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Estado local para los estados de envío de cada venta
  const [shippingStates, setShippingStates] = useState<{[key:string]: string}>({});

  // Función para actualizar el estado de envío de una venta
  const handleShippingStateChange = (ventaId: string, newState: string) => {
    setShippingStates(prev => ({ ...prev, [ventaId]: newState }));
  };

  useEffect(() => {
    if (!currentUser) return
    const fetchData = async () => {
      setLoadingSales(true)
      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'))
      const users: UserMap = {}
      usersSnap.forEach(doc => { users[doc.id] = doc.data() })
      setUsersMap(users)
      console.log('USERS:', users)
      // Fetch products
      const productsSnap = await getDocs(collection(db, 'products'))
      const products: ProductMap = {}
      productsSnap.forEach(doc => { products[doc.id] = doc.data() })
      setProductsMap(products)
      console.log('PRODUCTS:', products)
      
      // Fetch centralized purchases (sistema nuevo)
      const centralizedPurchasesSnap = await getDocs(collection(db, 'centralizedPurchases'))
      const centralizedPurchases: any[] = centralizedPurchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Desglosar productos vendidos por el vendedor actual desde compras centralizadas
      const ventasCentralizadas: VentaProductoSeller[] = centralizedPurchases.flatMap((compra: any) => {
        if (!Array.isArray(compra.items)) return []
        return compra.items
          .filter((item: any) => item.vendedorId === currentUser.firebaseUser.uid)
          .map((item: any) => ({
            compraId: compra.id || '',
            paymentId: compra.mercadoPagoPaymentId || '',
            status: compra.estadoPago || '',
            totalAmount: compra.total || 0,
            fechaCompra: compra.fecha || '',
            buyerId: compra.compradorId || '',
            compradorNombre: users[compra.compradorId]?.displayName || users[compra.compradorId]?.name || '',
            compradorEmail: users[compra.compradorId]?.email || '',
            productId: item?.productoId || '',
            productName: item?.productoNombre || products[item?.productoId]?.name || 'Producto sin nombre',
            productPrice: item?.precioUnitario || 0,
            quantity: item?.cantidad || 0,
            vendedorId: item?.vendedorId || '',
            vendedorNombre: item?.vendedorNombre || '',
            vendedorEmail: item?.vendedorEmail || '',
            shippingAddress: compra.shippingAddress,
            fechaPago: item?.fechaPagoVendedor || ''
          }))
      })
      
      // También obtener ventas del sistema antiguo (purchases)
      const purchasesSnap = await getDocs(collection(db, 'purchases'))
      const purchases: any[] = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // DEBUG: Log de las compras raw que llegan de Firestore
      console.log('DEBUG: Compras raw de Firestore:', purchases.map(compra => ({
        id: compra.id,
        createdAt: compra.createdAt,
        createdAtType: typeof compra.createdAt,
        createdAtKeys: compra.createdAt ? Object.keys(compra.createdAt) : 'null',
        fecha: compra.fecha,
        fechaType: typeof compra.fecha
      })))
      
      const ventasAntiguas: VentaProductoSeller[] = purchases.flatMap((compra: any) => {
        if (!Array.isArray(compra.products)) return []
        const fechaCompra = getFechaCompra(compra);
        
        // DEBUG: Log de cada compra procesada
        console.log('DEBUG: Procesando compra:', {
          id: compra.id,
          createdAt: compra.createdAt,
          fechaCompraResult: fechaCompra
        })
        
        return compra.products
          .filter((item: any) => item.vendedorId === currentUser.firebaseUser.uid) // Solo productos del vendedor actual
          .map((item: any) => ({
            compraId: compra.id || '',
            paymentId: compra.paymentId || '',
            status: compra.status || '',
            totalAmount: compra.totalAmount || 0,
            fechaCompra,
            buyerId: compra.buyerId || '',
            compradorNombre: users[compra.buyerId]?.displayName || users[compra.buyerId]?.name || '',
            compradorEmail: compra.buyerId || '',
            productId: item.productId || '',
            productName: item.name || 'Producto sin nombre',
            productPrice: item.price || 0,
            quantity: item.quantity || 0,
            vendedorId: item.vendedorId || '',
            vendedorNombre: '',
            vendedorEmail: '',
            shippingAddress: compra.shippingAddress || null,
            fechaPago: ''
          }))
      })
      
      // Combinar ventas de ambos sistemas
      const todasLasVentas = [...ventasCentralizadas, ...ventasAntiguas]
      console.log('VENTAS CENTRALIZADAS:', ventasCentralizadas)
      console.log('VENTAS ANTIGUAS:', ventasAntiguas)
      console.log('TODAS LAS VENTAS:', todasLasVentas)
      setSales(todasLasVentas)
      setLoadingSales(false)
      // Debug filteredSales
      setTimeout(() => {
        console.log('filteredSales:', filteredSales)
      }, 2000)
    }
    fetchData()
  }, [currentUser])

  // useEffect para manejar parámetros de suscripción en la URL
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (
      tab === "dashboard" ||
      tab === "products" ||
      tab === "addProduct" ||
      tab === "addService" ||
      tab === "agenda" ||
      tab === "shipping" ||
      tab === "earnings" ||
      tab === "create-coupons" ||
      tab === "profile"
    ) {
      setActiveTab(tab)
    }

    const subscriptionStatus = searchParams.get('subscription')
    const mercadoPagoStatus = searchParams.get('mercadopago')
    const mercadoPagoReason = searchParams.get('reason')
    
    if (subscriptionStatus === 'success') {
      setSubscriptionNotification({ show: true, status: 'success' })
      // Limpiar el parámetro de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('subscription')
      window.history.replaceState({}, '', newUrl.toString())
    } else if (subscriptionStatus === 'failure') {
      setSubscriptionNotification({ show: true, status: 'failure' })
      // Limpiar el parámetro de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('subscription')
      window.history.replaceState({}, '', newUrl.toString())
    }

    if (mercadoPagoStatus === 'connected') {
      toast({
        title: "Mercado Pago conectado",
        description: "Tu cuenta quedó vinculada correctamente.",
      })
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('mercadopago')
      newUrl.searchParams.delete('reason')
      window.history.replaceState({}, '', newUrl.toString())
    } else if (mercadoPagoStatus === 'error') {
      toast({
        title: "No se pudo conectar Mercado Pago",
        description: mercadoPagoReason || "Revisa la autorización e inténtalo de nuevo.",
        variant: "destructive",
      })
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('mercadopago')
      newUrl.searchParams.delete('reason')
      window.history.replaceState({}, '', newUrl.toString())
    } else if (mercadoPagoStatus === 'disconnected') {
      toast({
        title: "Mercado Pago desconectado",
        description: "La cuenta fue desvinculada correctamente.",
      })
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('mercadopago')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  // Mostrar todas las ventas del vendedor sin filtros
  const filteredSales = sales;

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / rowsPerPage)
  const paginatedSales = filteredSales.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // Exportar a Excel
  const handleExportExcel = () => {
    const data = filteredSales.map(sale => ({
      Fecha: sale.fechaCompra ? new Date(sale.fechaCompra).toLocaleString() : '',
      Producto: productsMap[sale.productId]?.name || sale.productName,
      Precio: sale.productPrice,
      Comprador: usersMap[sale.buyerId]?.name,
      EmailComprador: usersMap[sale.buyerId]?.email,
      Estado: sale.status,
      Compra: sale.compraId
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Ventas")
    XLSX.writeFile(wb, "ventas_vendedor.xlsx")
  }


  // Shipping management functions
  const fetchShipments = async () => {
    if (!currentUser) return
    
    setLoadingShipments(true)
    try {
      // Obtener envíos legacy
      const shipmentsData = await getSellerShipments(currentUser.firebaseUser.uid)
      setShipments(shipmentsData)
      
      // 🆕 NUEVO: Obtener envíos centralizados
      const centralizedShipmentsData = await getCentralizedShipmentsByVendor(currentUser.firebaseUser.uid)
      setCentralizedShipments(centralizedShipmentsData)
      
      console.log("Legacy shipments:", shipmentsData.length)
      console.log("Centralized shipments:", centralizedShipmentsData.length)
      
      // Inicializar envíos para compras aprobadas que no tengan información de envío
      const shipmentsToInitialize = shipmentsData.filter(
        shipment => shipment.status === "approved" && 
                   !shipment.productIsService && 
                   !shipment.shipping
      )
      
      if (shipmentsToInitialize.length > 0) {
        console.log(`Inicializando ${shipmentsToInitialize.length} envíos...`)
        for (const shipment of shipmentsToInitialize) {
          try {
            await initializeShipping(shipment.id, currentUser.firebaseUser.uid)
          } catch (error) {
            console.error(`Error inicializando envío ${shipment.id}:`, error)
          }
        }
        // Recargar datos después de inicializar
        const updatedShipments = await getSellerShipments(currentUser.firebaseUser.uid)
        setShipments(updatedShipments)
      }
    } catch (error) {
      console.error("Error fetching shipments:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los envíos",
        variant: "destructive",
      })
    } finally {
      setLoadingShipments(false)
    }
  }

  // 🆕 NUEVO: Función para actualizar envíos centralizados
  const handleUpdateCentralizedShippingStatus = async (
    purchaseId: string,
    itemId: string,
    newStatus: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string,
    carrierName?: string,
    notes?: string
  ) => {
    if (!currentUser) return

    setUpdatingShipment(`${purchaseId}-${itemId}`)
      try {
      const result = await updateCentralizedShippingStatus(
        purchaseId,
        currentUser.firebaseUser.uid,
        itemId,
        {
          status: newStatus,
          trackingNumber,
          carrierName,
          notes
        }
      )

      if (result.success) {
        const statusMessages = {
          pending: "Estado cambiado a pendiente",
          preparing: "Producto en preparación",
          shipped: "Producto enviado",
          delivered: "Producto entregado",
          cancelled: "Envío cancelado"
        }
        
        toast({
          title: "Envío actualizado",
          description: statusMessages[newStatus] || "Estado de envío actualizado correctamente",
        })
        
        if (trackingNumber && newStatus === "shipped") {
          toast({
            title: "Número de seguimiento",
            description: `Tracking: ${trackingNumber}${carrierName ? ` - ${carrierName}` : ''}`,
          })
        }
        
        await fetchShipments() // Recargar datos
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el estado de envío",
          variant: "destructive",
          })
        }
      } catch (error) {
      console.error("Error updating centralized shipping status:", error)
        toast({
          title: "Error",
        description: "Error al actualizar el estado de envío centralizado",
        variant: "destructive",
        })
      } finally {
      setUpdatingShipment(null)
    }
  }

  const handleUpdateShippingStatus = async (
    purchaseId: string, 
    newStatus: ShippingStatus,
    trackingNumber?: string,
    carrierName?: string,
    notes?: string
  ) => {
    if (!currentUser) return

    setUpdatingShipment(purchaseId)
    try {
      const result = await updateShippingStatus(
        purchaseId,
        {
          status: newStatus,
          trackingNumber,
          carrierName,
          notes
        },
        currentUser.firebaseUser.uid
      )

      if (result.success) {
        // Mensaje de éxito personalizado según el estado
        const statusMessages = {
          pending: "Estado cambiado a pendiente",
          preparing: "Producto en preparación",
          shipped: "Producto enviado",
          delivered: "Producto entregado",
          cancelled: "Envío cancelado"
        }
        
        toast({
          title: "Envío actualizado",
          description: statusMessages[newStatus] || "Estado de envío actualizado correctamente",
        })
        
        // Mostrar información adicional si se agregó tracking
        if (trackingNumber && newStatus === "shipped") {
          toast({
            title: "Número de seguimiento",
            description: `Tracking: ${trackingNumber}${carrierName ? ` - ${carrierName}` : ''}`,
          })
        }
        
        await fetchShipments() // Recargar datos
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el estado de envío",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating shipping status:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el estado de envío",
        variant: "destructive",
      })
    } finally {
      setUpdatingShipment(null)
    }
  }

  const getShippingIcon = (status: ShippingStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "preparing":
        return <Package className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getShippingBadgeClass = (status: ShippingStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "preparing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getShippingStatusText = (status: ShippingStatus) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "preparing":
        return "En preparación"
      case "shipped":
        return "Enviado"
      case "delivered":
        return "Entregado"
      case "cancelled":
        return "Cancelado"
      default:
        return "Desconocido"
    }
  }

  const getFilteredShipments = () => {
    if (shippingFilter === "all") {
      return shipments
    }
    return shipments.filter(shipment => shipment.shipping?.status === shippingFilter)
  }

  // Abrir modal de actualización de envío
  const openShippingUpdateModal = (shipmentId: string, newStatus: ShippingStatus) => {
    const shipment = shipments.find(s => s.id === shipmentId)
    setSelectedShipmentId(shipmentId)
    setSelectedNewStatus(newStatus)
    
    // Pre-llenar con datos existentes si los hay
    if (shipment?.shipping) {
      setTrackingNumber(shipment.shipping.trackingNumber || "")
      setCarrierName(shipment.shipping.carrierName || "")
      setShippingNotes(shipment.shipping.notes || "")
    } else {
      setTrackingNumber("")
      setCarrierName("")
      setShippingNotes("")
    }
    
    setIsShippingModalOpen(true)
  }

  // Cerrar modal y limpiar estado
  const closeShippingUpdateModal = () => {
    setIsShippingModalOpen(false)
    setSelectedShipmentId(null)
    setSelectedNewStatus(null)
    setTrackingNumber("")
    setCarrierName("")
    setShippingNotes("")
  }

  // Confirmar actualización de envío con datos del modal
  const confirmShippingUpdate = async () => {
    if (!selectedShipmentId || !selectedNewStatus) return

    await handleUpdateShippingStatus(
      selectedShipmentId,
      selectedNewStatus,
      trackingNumber || undefined,
      carrierName || undefined,
      shippingNotes || undefined
    )

    closeShippingUpdateModal()
  }

  useEffect(() => {
    if (currentUser) {
      setProfileImagePreviewUrl(currentUser.firebaseUser.photoURL || null)
    }
  }, [currentUser])

    // Verificar conexión MercadoPago - YA NO ES NECESARIO EN SISTEMA CENTRALIZADO
  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    // Ya no necesitamos verificar conexión con MercadoPago individual
    setIsLoading(false);
  }, [authLoading, currentUser])

  // Fetch coupons on component mount
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const q = query(collection(db, "coupons"), where("isActive", "==", true))
        const querySnapshot = await getDocs(q)
        const couponsData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            code: data.code,
            name: data.name,
            description: data.description || null,
            discountType: data.discountType,
            discountValue: data.discountValue,
            minPurchase: data.minPurchase || null,
            maxDiscount: data.maxDiscount || null,
            usageLimit: data.usageLimit || null,
            applicableTo: data.applicableTo,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            isActive: data.isActive === false ? false : true, // Ensure isActive is boolean
            createdAt: data.createdAt,
          } as Coupon
        })
        setAvailableCoupons(couponsData.filter(c => c.applicableTo === "all" || c.applicableTo === "sellers"))
      } catch (error) {
        console.error("Error fetching coupons:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los cupones.",
          variant: "destructive",
        })
      }
    }
    fetchCoupons()
  }, [toast])

  // Fetch my coupons when create-coupons tab is active
  useEffect(() => {
    if (activeTab === "create-coupons" && currentUser) {
      fetchMyCoupons()
    }
  }, [activeTab, currentUser])

  // 2. Refrescar el perfil del usuario al entrar a las pestañas de añadir producto o servicio
  useEffect(() => {
    if ((activeTab === "addService" || activeTab === "addProduct") && refreshUserProfile) {
      if (catalogLoadedForUid !== currentUser?.firebaseUser.uid) {
        refreshUserProfile()
      }
    }
  }, [activeTab, refreshUserProfile, catalogLoadedForUid, currentUser?.firebaseUser.uid])
  
  // Función para obtener el precio de suscripción
  const fetchSubscriptionPrice = async () => {
    setLoadingSubscriptionPrice(true);
    try {
      const response = await fetch('/api/subscription/active-price');
      const data = await response.json();
      
      if (data.price) {
        setSubscriptionPrice(data.price);
      }
    } catch (error) {
      console.error('Error al obtener precio de suscripción:', error);
    } finally {
      setLoadingSubscriptionPrice(false);
    }
  };
  
  // Cargar precio de suscripción cuando se active la pestaña de perfil
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchSubscriptionPrice();
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("mp_connecting")) {
      refreshUserProfile().then(() => {
        localStorage.removeItem("mp_connecting");
      });
    }
  }, [refreshUserProfile]);

  // Fetch shipments when shipping tab is active
  useEffect(() => {
    if (activeTab === "shipping" && currentUser) {
      fetchShipments()
    }
  }, [activeTab, currentUser])

  useEffect(() => {
    const currentUid = currentUser?.firebaseUser.uid
    if (activeTab === "earnings" && currentUid && earningsLoadedForUid !== currentUid) {
      fetchSellerEarnings()
      setEarningsLoadedForUid(currentUid)
    }
  }, [activeTab, currentUser?.firebaseUser.uid, earningsLoadedForUid])

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files)
      handleMediaFiles(files)
    }
  }

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }
    if (currentUser?.role !== "seller") {
      router.push(currentUser?.role === "admin" ? "/admin" : "/?error=not_seller")
      return
    }

    if (currentUser?.firebaseUser.uid && catalogLoadedForUid !== currentUser.firebaseUser.uid) {
      fetchSellerData(currentUser.firebaseUser.uid)
      fetchCategoriesAndBrands()
    }
  }, [currentUser?.firebaseUser.uid, currentUser?.role, authLoading, router, catalogLoadedForUid])

  const fetchSellerData = async (sellerUid: string) => {
    setLoadingData(true)
    setError(null)
    try {
      const productsQuery = query(
        collection(db, "products"),
        where("sellerId", "==", sellerUid),
        orderBy("createdAt", "desc"),
      )
      const productSnapshot = await getDocs(productsQuery)
      const products = productSnapshot.docs.map((doc) => {
        const data = doc.data()
        // Handle backward compatibility - convert old imageUrl to media array
        if (data.imageUrl && !data.media) {
          data.media = [
            {
              type: "image",
              url: data.imageUrl,
              path: data.imagePath || "",
            },
          ]
        }
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          brand: data.brand || undefined,
          media: data.media || [],
          isService: data.isService || false,
          stock: data.stock || undefined,
          sellerId: data.sellerId,
          serviceSchedule: data.serviceSchedule || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || undefined,
          couponId: data.couponId || null,
          couponStartDate: data.couponStartDate || null,
          couponEndDate: data.couponEndDate || null,
          condition: data.condition || 'nuevo',
          freeShipping: data.freeShipping || false,
          shippingCost: data.shippingCost || 0,
        } as Product
      })
      setMyProducts(products)
      setCatalogLoadedForUid(sellerUid)
    } catch (err) {
      console.error("Error fetching seller products:", err)
      setError("Error al cargar tus productos.")
    } finally {
      setLoadingData(false)
    }
  }

  const handleAssociateCouponClick = (couponId: string) => {
    setSelectedCouponId(couponId)
    setSelectedProductIds([]) // Clear previous selections
    setCouponApplyStartDate(undefined)
    setCouponApplyEndDate(undefined)
    setIsCouponModalOpen(true)
  }

  const handleProductSelection = (productId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedProductIds(prev => [...prev, productId])
    } else {
      setSelectedProductIds(prev => prev.filter(id => id !== productId))
    }
  }

  const associateCouponToProducts = async () => {
    if (!selectedCouponId || selectedProductIds.length === 0 || !currentUser) {
      toast({
        title: "Error",
        description: "Selecciona un cupón, al menos un producto y asegura tu sesión.",
        variant: "destructive",
      })
      return
    }

    if (!couponApplyStartDate || !couponApplyEndDate) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un rango de fechas de validez para el cupón.",
        variant: "destructive",
      })
      return
    }

    if (couponApplyStartDate > couponApplyEndDate) {
      toast({
        title: "Error",
        description: "La fecha de inicio no puede ser posterior a la fecha de fin.",
        variant: "destructive",
      })
      return
    }

    setAssociatingCoupon(true)
    try {
      for (const productId of selectedProductIds) {
        const productRef = doc(db, "products", productId)
        const couponData = cleanUndefinedFields({
          couponId: selectedCouponId,
          couponStartDate: couponApplyStartDate,
          couponEndDate: couponApplyEndDate,
          updatedAt: serverTimestamp(),
        })
        await updateDoc(productRef, couponData)
      }

      await fetchSellerData(currentUser.firebaseUser.uid) // Refresh product list
      setIsCouponModalOpen(false)
      toast({
        title: "Éxito",
        description: `Cupón asociado a ${selectedProductIds.length} producto(s) correctamente.`,
      })
    } catch (error) {
      console.error("Error associating coupon to products:", error)
      toast({
        title: "Error",
        description: "No se pudo asociar el cupón a los productos.",
        variant: "destructive",
      })
    } finally {
      setAssociatingCoupon(false)
    }
  }

  const removeCouponFromProduct = async (productId: string) => {
    if (!currentUser) return

    try {
      const productRef = doc(db, "products", productId)
      const couponRemovalData = cleanUndefinedFields({
        couponId: null,
        couponStartDate: null,
        couponEndDate: null,
        updatedAt: serverTimestamp(),
      })
      await updateDoc(productRef, couponRemovalData)

      await fetchSellerData(currentUser.firebaseUser.uid) // Refresh product list
      toast({
        title: "Éxito",
        description: "Cupón eliminado del producto correctamente.",
      })
    } catch (error) {
      console.error("Error removing coupon from product:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cupón del producto.",
        variant: "destructive",
      })
    }
  }

  // Funciones para creación de cupones propios
  const fetchMyCoupons = async () => {
    if (!currentUser) return

    try {
      const q = query(
        collection(db, "coupons"),
        where("sellerId", "==", currentUser.firebaseUser.uid),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      const couponsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Coupon[]
      setMyCoupons(couponsData)
    } catch (error) {
      console.error("Error fetching my coupons:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar tus cupones.",
        variant: "destructive",
      })
    }
  }

  const handleCreateCoupon = async () => {
    if (!currentUser) return

    if (newCouponCode.trim() === "") {
      toast({
        title: "Error",
        description: "El código del cupón no puede estar vacío.",
        variant: "destructive",
      })
      return
    }
    if (newCouponName.trim() === "") {
      toast({
        title: "Error",
        description: "El nombre del cupón no puede estar vacío.",
        variant: "destructive",
      })
      return
    }
    if (!newCouponDiscountValue || parseFloat(newCouponDiscountValue) <= 0) {
      toast({
        title: "Error",
        description: "El valor del descuento debe ser mayor a 0.",
        variant: "destructive",
      })
      return
    }

    setCreatingCoupon(true)
    setError(null)

    try {
      const couponData: any = {
        code: newCouponCode.toUpperCase(),
        name: newCouponName,
        description: newCouponDescription.trim() || null,
        discountType: newCouponDiscountType,
        discountValue: parseFloat(newCouponDiscountValue),
        minPurchase: newCouponMinPurchase ? parseFloat(newCouponMinPurchase) : null,
        maxDiscount: newCouponMaxDiscount ? parseFloat(newCouponMaxDiscount) : null,
        usageLimit: newCouponUsageLimit ? parseInt(newCouponUsageLimit) : null,
        usedCount: 0,
        sellerId: currentUser.firebaseUser.uid,
        applicableTo: "buyers", // Solo para compradores
        isActive: true,
        startDate: newCouponStartDate || serverTimestamp(),
        endDate: newCouponEndDate || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "coupons"), couponData)
      const newCoupon = { id: docRef.id, ...couponData } as Coupon
      
      setMyCoupons(prev => [newCoupon, ...prev])

      // Reset form
      setNewCouponCode("")
      setNewCouponName("")
      setNewCouponDescription("")
      setNewCouponDiscountType("percentage")
      setNewCouponDiscountValue("")
      setNewCouponMinPurchase("")
      setNewCouponMaxDiscount("")
      setNewCouponUsageLimit("")
      setNewCouponStartDate(undefined)
      setNewCouponEndDate(undefined)

      toast({
        title: "Éxito",
        description: "Cupón creado correctamente.",
      })
    } catch (error) {
      console.error("Error creating coupon:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el cupón. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setCreatingCoupon(false)
    }
  }

  const handleToggleMyCouponActive = async (couponId: string, currentStatus: boolean) => {
    try {
      const couponRef = doc(db, "coupons", couponId)
      await updateDoc(couponRef, { 
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      })
      setMyCoupons(prev => prev.map(coupon => 
        coupon.id === couponId ? { ...coupon, isActive: !currentStatus } : coupon
      ))
      toast({
        title: "Éxito",
        description: `Cupón ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`,
      })
    } catch (error) {
      console.error("Error updating coupon status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del cupón.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMyCoupon = async (couponId: string, couponName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el cupón "${couponName}"?`)) {
      return
    }
    try {
      await deleteDoc(doc(db, "coupons", couponId))
      setMyCoupons(prev => prev.filter(coupon => coupon.id !== couponId))
      toast({
        title: "Éxito",
        description: "Cupón eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting coupon:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cupón.",
        variant: "destructive",
      })
    }
  }

  const fetchCategoriesAndBrands = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, "categories"))
      const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]
      setCategories(categoriesData)

      const brandsSnapshot = await getDocs(collection(db, "brands"))
      const brandsData = brandsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Brand[]
      setBrands(brandsData)
    } catch (error) {
      console.error("Error fetching categories and brands:", error)
      setError("Error al cargar categorías y marcas.")
    }
  }

  const handleMediaFiles = async (files: File[]) => {
    setValidatingImages(true)
    setMediaValidationErrors([])
    const validFiles: File[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.type.startsWith("image/")) {
        // Image validation removed - no longer requiring white background
      } else if (file.type.startsWith("video/")) {
        // Validate video file
        if (!isValidVideoFile(file)) {
          errors.push(`${file.name}: Formato de video no válido o archivo muy grande (máx. 50MB)`)
          continue
        }

        try {
          const duration = await getVideoDuration(file)
          if (duration > 60) {
            // 60 seconds max
            errors.push(`${file.name}: El video no puede durar más de 60 segundos`)
            continue
          }
        } catch (err) {
          errors.push(`${file.name}: Error al procesar el video`)
          continue
        }
      } else {
        errors.push(`${file.name}: Solo se permiten imágenes y videos`)
        continue
      }

      validFiles.push(file)
    }

    setMediaValidationErrors(errors)

    if (validFiles.length > 0) {
      const newMediaFiles = [...mediaFiles, ...validFiles]
      const newPreviewUrls = [...mediaPreviewUrls, ...validFiles.map((file) => URL.createObjectURL(file))]

      setMediaFiles(newMediaFiles)
      setMediaPreviewUrls(newPreviewUrls)
      setCurrentProductMedia([]) // Clear current media when adding new files
    }

    setValidatingImages(false)
  }

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleMediaFiles(files)
    }
  }

  const uploadMediaToStorage = async (file: File): Promise<ProductMedia> => {
    if (!currentUser) throw new Error("Usuario no autenticado.")
    setUploadingMedia(true)

    const isVideo = file.type.startsWith("video/")
    const filePath = `products/${currentUser.firebaseUser.uid}/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)

    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      let thumbnail: string | undefined

      if (isVideo) {
        // Generate thumbnail for video
        thumbnail = await generateVideoThumbnail(file)
      }

      const result = {
        type: isVideo ? "video" : "image",
        url: downloadURL,
        path: filePath,
        thumbnail,
      }
      
      // Verificar si hay campos undefined y eliminarlos
      const undefinedFields = Object.keys(result).filter(key => result[key as keyof typeof result] === undefined)
      if (undefinedFields.length > 0) {
        // Eliminar campos undefined
        undefinedFields.forEach(field => delete result[field as keyof typeof result])
      }

      return result as ProductMedia
    } catch (error) {
      console.error("Error uploading media: ", error)
      throw new Error("Error al subir el archivo.")
    } finally {
      setUploadingMedia(false)
    }
  }

  const generateVideoThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = 1 // Capture frame at 1 second
      })

      video.addEventListener("seeked", () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8)
          resolve(thumbnailDataUrl)
        } else {
          reject(new Error("Could not get canvas context"))
        }
      })

      video.addEventListener("error", () => {
        reject(new Error("Error loading video"))
      })

      video.src = URL.createObjectURL(videoFile)
    })
  }

  const deleteMediaFromStorage = async (filePath: string) => {
    if (!filePath) return
    const mediaRef = ref(storage, filePath)
    try {
      await deleteObject(mediaRef)
      console.log("Previous media deleted from storage:", filePath)
    } catch (error) {
      console.error("Error deleting previous media from storage:", error)
    }
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingProductId(null)
    setProductName("")
    setProductDescription("")
    setProductPrice("")
    setProductCategory("")
    setProductBrand("")
    setMediaFiles([])
    setMediaPreviewUrls([])
    setCurrentProductMedia([])
    setProductIsService(false)
    setProductStock("")
    setError(null)
    setSuccessMessage(null)
    setMediaValidationErrors([])
    setProductCondition('nuevo')
    setFreeShipping(false)
    setShippingCost('')
  }

  const handleRemoveMedia = (index: number) => {
    const newMediaFiles = mediaFiles.filter((_, i) => i !== index)
    const newPreviewUrls = mediaPreviewUrls.filter((_, i) => i !== index)
    setMediaFiles(newMediaFiles)
    setMediaPreviewUrls(newPreviewUrls)
  }

  const handleRemoveCurrentMedia = (index: number) => {
    const newCurrentMedia = currentProductMedia.filter((_, i) => i !== index)
    setCurrentProductMedia(newCurrentMedia)
  }

  const handleEditProduct = (product: Product) => {
    resetForm()
    setIsEditing(true)
    setEditingProductId(product.id)
    setProductName(product.name)
    setProductDescription(product.description)
    setProductPrice(product.price.toString())
    setProductCategory(product.category)
    setProductBrand(product.brand || "")
    setCurrentProductMedia(product.media || [])
    setProductIsService(product.isService)
    setProductStock(product.stock?.toString() || "")
    setProductCondition(product.condition || 'nuevo')
    setFreeShipping(product.freeShipping || false)
    setShippingCost(product.shippingCost ? product.shippingCost.toString() : '')
    if (product.isService) {
      setActiveAddTab("service")
      setActiveTab("addService")
    } else {
      setActiveAddTab("product")
      setActiveTab("addProduct")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) {
      return
    }
    try {
      const productToDelete = myProducts.find((p) => p.id === productId)
      if (productToDelete?.media) {
        for (const media of productToDelete.media) {
          await deleteMediaFromStorage(media.path)
        }
      }
      await deleteDoc(doc(db, "products", productId))
      setMyProducts((prevProducts) => prevProducts.filter((p) => p.id !== productId))
      setSuccessMessage("Producto eliminado exitosamente.")
    } catch (err) {
      console.error("Error deleting product:", err)
      setError("Error al eliminar el producto.")
    }
  }

  // Nueva función de validación para productos
  const validateProductForm = () => {
    const errors: {[key:string]:string} = {}
    if (!productName.trim()) errors.name = "El nombre es obligatorio"
    if (!productDescription.trim()) errors.description = "La descripción es obligatoria"
    if (!productPrice || isNaN(Number(productPrice)) || Number(productPrice) <= 0) errors.price = "El precio es obligatorio y debe ser mayor a 0"
    if (!productCategory) errors.category = "La categoría es obligatoria"
    if (!productIsService && (!productStock || isNaN(Number(productStock)) || Number(productStock) < 0)) errors.stock = "El stock es obligatorio y debe ser 0 o mayor"
    if (mediaFiles.length === 0 && currentProductMedia.length === 0) errors.media = "Debes subir al menos una imagen o video"
    if (!productCondition) errors.condition = "La condición es obligatoria"
    if (!freeShipping && (!shippingCost || isNaN(Number(shippingCost)) || Number(shippingCost) < 0)) errors.shippingCost = "El costo de envío es obligatorio o selecciona envío gratis"
    return errors
  }

  // Modificar handleSubmitProduct para usar validación visual
  const handleSubmitProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!hasActiveSubscription) {
      setError(subscriptionBlockedMessage)
      return
    }

    setProductFormTouched(true)
    const errors = validateProductForm()
    setProductFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError("Por favor, corrige los errores antes de continuar.")
      return
    }

    if (!productName || !productPrice || !productCategory || !currentUser) {
      setError("Nombre, precio y categoría son obligatorios.")
      return
    }

    if (mediaFiles.length === 0 && currentProductMedia.length === 0) {
      setError("Debes subir al menos una imagen o video del producto.")
      return
    }

    setSubmittingProduct(true)
    setError(null)
    setSuccessMessage(null)

    let newMedia: ProductMedia[] = [...currentProductMedia]

    try {
      // Upload new media files
      if (mediaFiles.length > 0) {
        // Delete old media if editing
        if (isEditing && currentProductMedia.length > 0) {
          for (const media of currentProductMedia) {
            await deleteMediaFromStorage(media.path)
          }
          newMedia = []
        }

        // Upload new media
        for (const file of mediaFiles) {
          const uploadedMedia = await uploadMediaToStorage(file)
          newMedia.push(uploadedMedia)
        }
      }

      const productData: any = {
        name: productName,
        description: productDescription,
        price: Number.parseFloat(productPrice),
        category: productCategory,
        media: newMedia,
        isService: productIsService,
        sellerId: currentUser.firebaseUser.uid,
        updatedAt: serverTimestamp(),
        condition: productCondition,
        freeShipping: freeShipping,
        shippingCost: freeShipping ? 0 : Number.parseFloat(shippingCost || '0'),
      }

      // Solo agregar brand si tiene valor
      if (productBrand && productBrand.trim()) {
        productData.brand = productBrand
      }

      // Solo agregar stock si no es servicio y tiene valor
      if (!productIsService && productStock && productStock.trim()) {
        productData.stock = Number.parseInt(productStock)
      }

      if (isEditing && editingProductId) {
        const productRef = doc(db, "products", editingProductId)
        await updateDoc(productRef, productData)
        setMyProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === editingProductId ? { ...p, ...productData, updatedAt: new Date() } : p)),
        )
        setSuccessMessage("Producto actualizado exitosamente.")
      } else {
        const productDataWithTimestamp = { ...productData, createdAt: serverTimestamp() }
        const docRef = await addDoc(collection(db, "products"), productDataWithTimestamp)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...productDataWithTimestamp, createdAt: new Date(), updatedAt: new Date() } as Product,
          ...prevProducts,
        ])
        setSuccessMessage("Producto añadido exitosamente.")
      }
      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error submitting product:", err)
      setError(
        `Error al ${isEditing ? "actualizar" : "añadir"} el producto. ${err instanceof Error ? err.message : ""}`,
      )
    } finally {
      setSubmittingProduct(false)
    }
  }

  // Profile picture functions (keeping existing code)
  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImageFile(file)
      setProfileImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const uploadProfileImageToStorage = async (file: File): Promise<{ downloadURL: string; filePath: string }> => {
    if (!currentUser) throw new Error("Usuario no autenticado.")
    setUploadingProfileImage(true)
    const filePath = `users/${currentUser.firebaseUser.uid}/profile/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)
    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return { downloadURL, filePath }
    } catch (error) {
      console.error("Error uploading profile image: ", error)
      throw new Error("Error al subir la imagen de perfil.")
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const deleteProfileImageFromStorage = async (filePath: string) => {
    if (!filePath) return
    const imageRef = ref(storage, filePath)
    try {
      await deleteObject(imageRef)
      console.log("Previous profile image deleted from storage:", filePath)
    } catch (error) {
      console.error("Error deleting previous profile image from storage:", error)
    }
  }

  const handleSaveProfileImage = async () => {
    if (!currentUser || !profileImageFile) {
      setError("Por favor, selecciona una imagen para subir.")
      return
    }

    setUploadingProfileImage(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (currentUser.photoPath) {
        await deleteProfileImageFromStorage(currentUser.photoPath)
      }

      const { downloadURL, filePath } = await uploadProfileImageToStorage(profileImageFile)

      const userRef = doc(db, "users", currentUser.firebaseUser.uid)
      const userData = cleanUndefinedFields({
        photoURL: downloadURL,
        photoPath: filePath,
        updatedAt: serverTimestamp(),
      })
      await updateDoc(userRef, userData)

      await refreshUserProfile()

      setSuccessMessage("Imagen de perfil actualizada exitosamente.")
      setProfileImageFile(null)
    } catch (err) {
      console.error("Error saving profile image:", err)
      setError(`Error al actualizar la imagen de perfil. ${err instanceof Error ? err.message : ""}`)
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const handleRemoveCurrentProfileImage = async () => {
    if (!currentUser) {
      setError("No hay usuario autenticado.")
      return
    }
    if (!currentUser.photoPath) {
      setError("No hay imagen de perfil para eliminar.")
      return
    }

    setUploadingProfileImage(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await deleteProfileImageFromStorage(currentUser.photoPath) // currentUser.photoPath ya está validado como string aquí

      const userRef = doc(db, "users", currentUser.firebaseUser.uid)
      const userData = cleanUndefinedFields({
        photoURL: null,
        photoPath: null,
        updatedAt: serverTimestamp(),
      })
      await updateDoc(userRef, userData)

      await refreshUserProfile()

      setSuccessMessage("Imagen de perfil eliminada exitosamente.")
      setProfileImageFile(null)
      setProfileImagePreviewUrl(null)
    } catch (err) {
      console.error("Error removing profile image:", err)
      setError(`Error al eliminar la imagen de perfil. ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploadingProfileImage(false)
    }
  }

  // Función de desconexión - YA NO ES NECESARIA EN SISTEMA CENTRALIZADO
  // const handleDisconnect = async () => {
  //   // Ya no necesitamos desconectar cuentas individuales de MercadoPago
  // }

  // 3. Función para suscribirse
  const handleSubscribe = async () => {
    console.log("[handleSubscribe] Click en Suscribirse");
    if (!currentUser) {
      console.error("[handleSubscribe] No hay usuario autenticado (contexto)");
      toast({ title: 'Error', description: 'No hay usuario autenticado', variant: 'destructive' });
      return;
    }
    setSubscribing(true);
    try {
      // Usar el servicio API actualizado
      const response = await ApiService.createSubscriptionPreference({
        userId: currentUser.firebaseUser.uid,
        planType: 'basic', // Cambiar de 'BASICO' a 'basic' para coincidir con el backend
        payerEmail: currentUser.firebaseUser.email || undefined,
      });

      console.log("[handleSubscribe] Respuesta de la API:", response);
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data?.init_point) {
        window.location.href = response.data.init_point;
      } else {
        toast({ title: 'Error', description: 'No se recibió un punto de inicio de suscripción', variant: 'destructive' });
      }
    } catch (err) {
      console.error("[handleSubscribe] Error en la suscripción:", err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "No hay usuario autenticado", variant: "destructive" })
      return
    }

    const confirmed = window.confirm(
      "¿Cancelar la suscripción?\n\nSe corta la renovación automática. Si todavía te queda tiempo del mes ya pagado, seguís operando hasta esa fecha."
    )
    if (!confirmed) return

    setCancellingSubscription(true)
    try {
      const response = await ApiService.cancelSubscription()
      if (response.error) throw new Error(response.error)

      await refreshUserProfile()

      if (response.data?.immediate) {
        toast({
          title: "Suscripción cancelada",
          description: "Ya no tenés acceso para publicar. Podés reactivar cuando quieras.",
        })
      } else if (response.data?.accessUntil) {
        toast({
          title: "Renovación cancelada",
          description: `Seguís operando hasta el ${format(new Date(response.data.accessUntil), "dd/MM/yyyy")}. Después se suspende el acceso.`,
          duration: 6000,
        })
      } else {
        toast({ title: "Suscripción cancelada", description: "No se renovará el próximo mes." })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo cancelar la suscripción",
        variant: "destructive",
      })
    } finally {
      setCancellingSubscription(false)
    }
  };

  const handleConnectMercadoPago = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "No hay usuario autenticado", variant: "destructive" })
      return
    }

    setConnectingMercadoPago(true)
    try {
      const response = await ApiService.startMercadoPagoConnection()
      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.authorizationUrl) {
        throw new Error("No se recibió la URL de autorización de Mercado Pago")
      }

      window.location.href = response.data.authorizationUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setConnectingMercadoPago(false)
    }
  }

  const handleDisconnectMercadoPago = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "No hay usuario autenticado", variant: "destructive" })
      return
    }

    const shouldDisconnect = window.confirm("¿Quieres desconectar tu cuenta de Mercado Pago?")
    if (!shouldDisconnect) {
      return
    }

    setDisconnectingMercadoPago(true)
    try {
      const response = await ApiService.disconnectMercadoPagoConnection()
      if (response.error) {
        throw new Error(response.error)
      }

      await refreshUserProfile()
      toast({ title: "Mercado Pago desconectado", description: "Tu cuenta fue desvinculada correctamente." })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setDisconnectingMercadoPago(false)
    }
  }

  // useEffect para mp_disconnected - YA NO ES NECESARIO EN SISTEMA CENTRALIZADO
  // useEffect(() => {
  //   if (typeof window !== "undefined" && localStorage.getItem("mp_disconnected")) {
  //     refreshUserProfile().then(() => {
  //       localStorage.removeItem("mp_disconnected");
  //     });
  //   }
  // }, [refreshUserProfile]);

  // Nueva función de validación para servicios
  const validateServiceForm = () => {
    const errors: {[key:string]:string} = {}
    if (!productName.trim()) errors.name = "El nombre es obligatorio"
    if (!productDescription.trim()) errors.description = "La descripción es obligatoria"
    if (!productPrice || isNaN(Number(productPrice)) || Number(productPrice) <= 0) errors.price = "El precio es obligatorio y debe ser mayor a 0"
    if (!productCategory) errors.category = "La categoría es obligatoria"
    if (mediaFiles.length === 0 && currentProductMedia.length === 0) errors.media = "Debes subir al menos una imagen o video"
    return errors
  }

  // Nuevo handleSubmitService para validación visual
  const handleSubmitService = async (e: FormEvent) => {
    e.preventDefault()
    if (!hasActiveSubscription) {
      setError(subscriptionBlockedMessage)
      return
    }

    setServiceFormTouched(true)
    const errors = validateServiceForm()
    setServiceFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError("Por favor, corrige los errores antes de continuar.")
      return
    }

    if (!productName || !productPrice || !productCategory || !currentUser) {
      setError("Nombre, precio y categoría son obligatorios.")
      return
    }

    if (mediaFiles.length === 0 && currentProductMedia.length === 0) {
      setError("Debes subir al menos una imagen o video del servicio.")
      return
    }

    setSubmittingProduct(true)
    setError(null)
    setSuccessMessage(null)

    let newMedia: ProductMedia[] = [...currentProductMedia]

    try {
      // Upload new media files
      if (mediaFiles.length > 0) {
        // Delete old media if editing
        if (isEditing && currentProductMedia.length > 0) {
          for (const media of currentProductMedia) {
            await deleteMediaFromStorage(media.path)
          }
          newMedia = []
        }

        // Upload new media
        for (const file of mediaFiles) {
          const uploadedMedia = await uploadMediaToStorage(file)
          newMedia.push(uploadedMedia)
        }
      }

      const serviceData: any = {
        name: productName,
        description: productDescription,
        price: Number.parseFloat(productPrice),
        category: productCategory,
        media: newMedia,
        isService: true, // Siempre true para servicios
        sellerId: currentUser.firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }

      // Solo agregar brand si tiene valor
      if (productBrand && productBrand.trim()) {
        serviceData.brand = productBrand
      }

      if (isEditing && editingProductId) {
        const serviceRef = doc(db, "products", editingProductId)
        await updateDoc(serviceRef, serviceData)
        setMyProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === editingProductId ? { ...p, ...serviceData, updatedAt: new Date() } : p)),
        )
        setSuccessMessage("Servicio actualizado exitosamente.")
      } else {
        const serviceDataWithTimestamp = { ...serviceData, createdAt: serverTimestamp() }
        const docRef = await addDoc(collection(db, "products"), serviceDataWithTimestamp)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...serviceDataWithTimestamp, createdAt: new Date(), updatedAt: new Date() } as Product,
          ...prevProducts,
        ])
        setSuccessMessage("Servicio añadido exitosamente.")
      }
      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error submitting service:", err)
      setError(
        `Error al ${isEditing ? "actualizar" : "añadir"} el servicio. ${err instanceof Error ? err.message : ""}`,
      )
    } finally {
      setSubmittingProduct(false)
    }
  }

  const fetchSellerEarnings = async () => {
    if (!currentUser) return
    
    setLoadingEarnings(true)
    try {
      // Obtener ventas del vendedor
      const sales = await getSellerSales(currentUser.firebaseUser.uid)
      setSellerSales(sales)
      
      // Obtener distribución de comisiones
      const distribution = await calculateCommissionDistribution()
      const sellerDistribution = distribution.find(d => d.vendedorId === currentUser.firebaseUser.uid)
      setCommissionDistribution(sellerDistribution || null)
      
    } catch (err) {
      console.error("Error fetching seller earnings:", err)
      setError("Error al cargar los datos de ganancias")
    } finally {
      setLoadingEarnings(false)
    }
  }

  const getFilteredSales = () => {
    let filtered = sellerSales
    
    if (earningsFilter !== 'all') {
      filtered = filtered.filter(sale => sale.estadoPago === earningsFilter)
    }
    
    if (earningsDateFrom) {
      filtered = filtered.filter(sale => sale.fechaCompra >= earningsDateFrom)
    }
    
    if (earningsDateTo) {
      filtered = filtered.filter(sale => sale.fechaCompra <= earningsDateTo)
    }
    
    return filtered.sort((a, b) => new Date(b.fechaCompra).getTime() - new Date(a.fechaCompra).getTime())
  }

  const visibleSellerSales = getFilteredSales()

  const formatSaleDate = (value: any) => {
    if (!value) return "—"

    if (typeof value === "object" && value._seconds) {
      const date = new Date(value._seconds * 1000)
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString()
    }

    if (typeof value === "number") {
      const date = new Date(value)
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString()
    }

    if (typeof value === "string") {
      const date = new Date(value)
      return isNaN(date.getTime()) ? value : date.toLocaleDateString()
    }

    return "—"
  }

  const downloadInvoice = async (startDate: string, endDate: string) => {
    if (!currentUser) return
    
    try {
      // Filtrar ventas por rango de fechas
      let filteredSales = sellerSales
      if (startDate) {
        filteredSales = filteredSales.filter(sale => sale.fechaCompra >= startDate)
      }
      if (endDate) {
        filteredSales = filteredSales.filter(sale => sale.fechaCompra <= endDate)
      }
      
      // Crear y descargar archivo CSV
      const csvContent = [
        ['Fecha', 'Compra ID', 'Productos', 'Subtotal', 'Comisión', 'Neto', 'Estado'],
        ...filteredSales.map(sale => [
          sale.fechaCompra,
          sale.compraId,
          sale.items.map(item => `${item.productoNombre} x${item.cantidad}`).join('; '),
                  formatPriceNumber(sale.subtotalVendedor),
        formatPriceNumber(sale.comisionApp),
        formatPriceNumber(sale.montoAPagar),
          sale.estadoPago
        ])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const vendorName = currentUser.firebaseUser.displayName || 'vendedor'
      const dateRange = startDate && endDate ? `${startDate}-${endDate}` : 'todas-las-fechas'
      a.download = `ventas-${vendorName}-${dateRange}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error("Error generating invoice:", err)
      setError("Error al generar la factura")
    }
  }

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/40">
        <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
      </div>
    )
  }

  const totalProductsValue = myProducts.reduce(
    (sum, product) => sum + product.price * (product.stock || (product.isService ? 1 : 0)),
    0,
  )

  // Estadísticas de envíos
  const shippingStats = {
    total: shipments.length,
    pending: shipments.filter(s => s.shipping?.status === "pending").length,
    preparing: shipments.filter(s => s.shipping?.status === "preparing").length,
    shipped: shipments.filter(s => s.shipping?.status === "shipped").length,
    delivered: shipments.filter(s => s.shipping?.status === "delivered").length,
    cancelled: shipments.filter(s => s.shipping?.status === "cancelled").length,
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    )
  }

  // Filtrar envíos por vendedor logueado
  const myProductIds = myProducts.map((p) => p.id);
  const filteredShipments = shipments.filter(
    (shipment) => myProductIds.includes(shipment.productId)
  );
  const filteredCentralizedShipments = centralizedShipments.filter(
    (shipment) => myProductIds.includes(shipment.productId)
  );

  // Función para guardar el estado de envío en Firestore (con notificaciones)
  const handleSaveShippingState = async (venta: any) => {
    console.log('🚀 FUNCIÓN EJECUTADA - handleSaveShippingState');
    console.log('Venta recibida:', venta);
    
    try {
      console.log('Intentando guardar estado de envío para:', venta);
      
      const compraRef = doc(db, "purchases", venta.compraId);
      const compraSnap = await getDoc(compraRef);
      
      if (!compraSnap.exists()) {
        console.error('Compra no encontrada:', venta.compraId);
        toast({
          title: 'Error',
          description: 'No se encontró la compra especificada.',
          variant: 'destructive',
        });
        return;
      }
      
      const compraData = compraSnap.data();
      console.log('Datos de compra:', compraData);
      
      const products = Array.isArray(compraData.products) ? [...compraData.products] : [];
      console.log('Productos en la compra:', products);
      
      const idx = products.findIndex((p: any) => p.productId === venta.productId);
      console.log('Índice del producto encontrado:', idx);
      
      if (idx === -1) {
        console.error('Producto no encontrado en la compra:', venta.productId);
        toast({
          title: 'Error',
          description: 'No se encontró el producto en la compra.',
          variant: 'destructive',
        });
        return;
      }
      
      const newShippingStatus = shippingStates[venta.compraId + '-' + venta.productId] || 'pendiente';
      console.log('Nuevo estado de envío:', newShippingStatus);
      
      products[idx] = {
        ...products[idx],
        shippingStatus: newShippingStatus,
      };
      
      console.log('Productos actualizados:', products);
      
      await updateDoc(compraRef, { products });
      
      toast({
        title: 'Estado de envío actualizado',
        description: `El estado del envío para "${venta.productName}" se guardó correctamente.`,
        variant: 'default',
      });
      
      // Recargar los datos de ventas para mostrar el cambio
      if (currentUser) {
        fetchSellerData(currentUser.firebaseUser.uid);
      }
      
    } catch (err) {
      console.error('Error actualizando estado de envío:', err);
      toast({
        title: 'Error al actualizar el estado',
        description: `No se pudo guardar el estado de envío: ${err instanceof Error ? err.message : 'Error desconocido'}`,
        variant: 'destructive',
      });
    }
  };

  const handleSellerNav = (tab: SellerDashboardTab) => {
    if (tab === "products" || tab === "addProduct" || tab === "addService") {
      resetForm()
    }
    if (tab === "addService") {
      setActiveAddTab("service")
    }
    setActiveTab(tab)
  }

  const sellerStoreHref = currentUser?.firebaseUser?.uid
    ? `/seller/${currentUser.firebaseUser.uid}`
    : undefined

  return (
    <>
    <SellerDashboardShell
      activeTab={activeTab}
      onNavigate={handleSellerNav}
      isEditing={isEditing}
      userName={currentUser?.firebaseUser?.displayName || currentUser?.firebaseUser?.email?.split("@")[0]}
      userPhoto={profileImagePreviewUrl || currentUser?.photoURL}
      storeHref={sellerStoreHref}
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
            <div className="space-y-6">
              {!mercadoPagoConnected && (
                <Alert
                  variant={mercadoPagoTokenExpired ? "destructive" : "default"}
                  className="rounded-2xl border-purple-200 bg-purple-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {mercadoPagoTokenExpired ? "Reconecta Mercado Pago" : "Conecta Mercado Pago"}
                  </AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <span>{mercadoPagoConnectionSummary}</span>
                    <div>
                      <Button
                        type="button"
                        onClick={handleConnectMercadoPago}
                        disabled={connectingMercadoPago}
                        size="sm"
                        className="rounded-full bg-purple-900 text-white hover:bg-purple-800"
                      >
                        {connectingMercadoPago ? "Conectando…" : mercadoPagoActionLabel}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <BuyerStatCard title="Productos publicados" value={myProducts.length} icon={ShoppingBag} />
                <BuyerStatCard
                  title="Valor en catálogo"
                  value={formatPriceNumber(totalProductsValue)}
                  icon={ListFilter}
                  accent="green"
                />
                <BuyerStatCard title="Envíos totales" value={shippingStats.total} icon={Truck} accent="amber" />
              </div>

              <BuyerPanel title="Detalle de envíos" description="Estado actual de tus pedidos">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{shippingStats.pending}</p>
                    <p className="text-sm text-gray-500">Pendientes</p>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{shippingStats.shipped}</p>
                    <p className="text-sm text-gray-500">Enviados</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{shippingStats.delivered}</p>
                    <p className="text-sm text-gray-500">Entregados</p>
                  </div>
                </div>
              </BuyerPanel>
            </div>
          )}

          {/* Products Tab - Updated to show media */}
          {activeTab === "products" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Mis Productos y Servicios</CardTitle>
                <CardDescription>Gestiona los ítems que tienes a la venta.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
                  </div>
                ) : myProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-lg text-muted-foreground mb-6">Aún no tienes productos publicados.</p>
                    <Button
                      onClick={() => {
                        resetForm()
                        setActiveTab("addProduct")
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Publicar mi primer producto
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Media</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="hidden md:table-cell">Stock</TableHead>
                            <TableHead className="hidden md:table-cell">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myProducts.map((prod) => (
                            <TableRow key={prod.id}>
                              <TableCell>
                                <div className="flex gap-1">
                                  {prod.media && prod.media.length > 0 ? (
                                    prod.media.slice(0, 2).map((media, index) => (
                                      <div key={index} className="relative w-8 h-8 rounded-md overflow-hidden">
                                        {media.type === "image" ? (
                                          <Image
                                            src={media.url || "/placeholder.svg"}
                                            alt={`${prod.name} ${index + 1}`}
                                            width={32}
                                            height={32}
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center">
                                            <Video className="h-4 w-4 text-gray-600" />
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center">
                                      <ShoppingBag className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  {prod.media && prod.media.length > 2 && (
                                    <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center text-xs">
                                      +{prod.media.length - 2}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{prod.name}</TableCell>
                              <TableCell>{formatPrice(prod.price)}</TableCell>
                              <TableCell>{prod.isService ? "Servicio" : "Producto"}</TableCell>
                              <TableCell className="text-center hidden md:table-cell">{prod.isService ? "N/A" : (prod.stock ?? 0)}</TableCell>
                              <TableCell className="space-x-1 hidden md:table-cell">
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => handleEditProduct(prod)}
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    title="Publicar historia"
                                    asChild
                                  >
                                    <Link href={`/historias/nueva?product=${prod.id}`}>
                                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => handleDeleteProduct(prod.id)}
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Product Tab - Updated with new media upload */}
          {activeTab === "addProduct" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Añadir Nuevo Producto</CardTitle>
                <CardDescription>Completa los detalles para agregar un ítem.</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSubscriptionGate()}
                {/* Resumen de errores */}
                {productFormTouched && Object.keys(productFormErrors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Faltan campos obligatorios</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {Object.values(productFormErrors).map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                      </AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleSubmitProduct} className="space-y-6">
                  <fieldset disabled={!hasActiveSubscription} style={{ opacity: hasActiveSubscription ? 1 : 0.5 }}>
                  {/* Media Upload Section */}
                  <div>
                    <Label htmlFor="productMedia" className="text-base">
                      Imágenes y Videos del Producto
                    </Label>
                    <div className="mt-2 space-y-4">
                      {/* Validation Requirements */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Requisitos importantes:</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                              <li><strong>Imágenes:</strong> Se recomienda usar imágenes de alta calidad con fondo blanco para mejores ventas</li>
                              <li><strong>Videos:</strong> Máximo 60 segundos y 50MB de tamaño</li>
                            <li>Formatos soportados: JPG, PNG, WebP para imágenes | MP4, WebM para videos</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      {/* Validation Errors */}
                      {mediaValidationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Errores de validación:</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {mediaValidationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                        {/* Input File */}
                        <Input
                          id="productMedia"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleMediaChange}
                          className="block w-full max-w-xs text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-orange-100 file:text-orange-700
                            hover:file:bg-orange-200
                            cursor-pointer"
                          disabled={validatingImages}
                        />

                        {/* Preview */}
                      {mediaPreviewUrls.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Nuevos archivos seleccionados:</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {mediaPreviewUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                                  {mediaFiles[index].type.startsWith("image/") ? (
                                    <Image
                                      src={url || "/placeholder.svg"}
                                      alt={`Preview ${index + 1}`}
                                      layout="fill"
                                      objectFit="cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                      <div className="text-center">
                                        <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                        <span className="text-xs text-gray-600">Video</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveMedia(index)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                                  {mediaFiles[index].type.startsWith("image/") ? "imagen" : "video"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                        {/* Loading States */}
                        {validatingImages && (
                        <div className="flex items-center gap-2 text-purple-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Validando archivos...</span>
                        </div>
                      )}
                        {/* Error de media */}
                        {productFormTouched && productFormErrors.media && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.media}</p>
                      )}
                    </div>
                  </div>

                  <div>
                      <Label htmlFor="productName" className="text-base">Nombre</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                        className={productFormTouched && productFormErrors.name ? 'border-red-500' : ''}
                    />
                      {productFormTouched && productFormErrors.name && (
                        <p className="text-xs text-red-600 mt-1">{productFormErrors.name}</p>
                      )}
                  </div>
                  <div>
                      <Label htmlFor="productDescription" className="text-base">Descripción</Label>
                    <Textarea
                      id="productDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      rows={4}
                        className={productFormTouched && productFormErrors.description ? 'border-red-500' : ''}
                    />
                      {productFormTouched && productFormErrors.description && (
                        <p className="text-xs text-red-600 mt-1">{productFormErrors.description}</p>
                      )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="productPrice" className="text-base">Precio (ARS)</Label>
                      <Input
                        id="productPrice"
                        type="number"
                        step="0.01"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                          className={productFormTouched && productFormErrors.price ? 'border-red-500' : ''}
                      />
                        {productFormTouched && productFormErrors.price && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.price}</p>
                        )}
                    </div>
                    {!productIsService && (
                      <div>
                          <Label htmlFor="productStock" className="text-base">Stock (Unidades)</Label>
                        <Input
                          id="productStock"
                          type="number"
                          value={productStock}
                          onChange={(e) => setProductStock(e.target.value)}
                            className={productFormTouched && productFormErrors.stock ? 'border-red-500' : ''}
                        />
                          {productFormTouched && productFormErrors.stock && (
                            <p className="text-xs text-red-600 mt-1">{productFormErrors.stock}</p>
                          )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="productCategory" className="text-base">Categoría</Label>
                      <Select value={productCategory} onValueChange={setProductCategory} required>
                          <SelectTrigger className={productFormTouched && productFormErrors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                        {productFormTouched && productFormErrors.category && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.category}</p>
                        )}
                    </div>
                    <div>
                      <Label htmlFor="productBrand" className="text-base">
                        Marca (Opcional)
                      </Label>
                      <Select value={productBrand} onValueChange={setProductBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una marca" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="productCondition" className="text-base">Condición</Label>
                    <Select value={productCondition} onValueChange={v => setProductCondition(v as 'nuevo' | 'usado')} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona condición" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="usado">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                    {productFormTouched && productFormErrors.condition && (
                      <p className="text-xs text-red-600 mt-1">{productFormErrors.condition}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-base">Envío</Label>
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id="freeShipping"
                        checked={freeShipping}
                        onChange={e => setFreeShipping(e.target.checked)}
                        className="mr-2"
                      />
                      <Label htmlFor="freeShipping" className="text-sm">Envío gratis</Label>
                    </div>
                    {!freeShipping && (
                      <div>
                        <Input
                          id="shippingCost"
                          type="number"
                          step="0.01"
                          value={shippingCost}
                          onChange={e => setShippingCost(e.target.value)}
                          placeholder="Costo de envío (ARS)"
                          className={productFormTouched && productFormErrors.shippingCost ? 'border-red-500' : ''}
                        />
                        {productFormTouched && productFormErrors.shippingCost && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.shippingCost}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={submittingProduct || !hasActiveSubscription}>
                      {submittingProduct ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : isEditing ? (
                        "Actualizar Producto"
                      ) : (
                        "Añadir Producto"
                      )}
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetForm} disabled={submittingProduct}>
                      Cancelar
                    </Button>
                  </div>
                  </fieldset>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Service Tab - Updated with new media upload */}
          {activeTab === "addService" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Añadir Nuevo Servicio</CardTitle>
                <CardDescription>Completa los detalles para agregar un servicio.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Notificación de suscripción */}
                {renderSubscriptionGate()}
                {/* Resumen de errores */}
                {serviceFormTouched && Object.keys(serviceFormErrors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Faltan campos obligatorios</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {Object.values(serviceFormErrors).map((err, idx) => <li key={idx}>{err}</li>)}
                      </ul>
                      </AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleSubmitService} className="space-y-6 relative">
                  <fieldset disabled={!hasActiveSubscription} style={{ opacity: hasActiveSubscription ? 1 : 0.5 }}>
                    {/* Media Upload Section */}
                    <div>
                      <Label htmlFor="serviceMedia" className="text-base">Imágenes y Videos del Servicio</Label>
                      <div className="mt-2 space-y-4">
                        {/* Validation Requirements */}
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Requisitos importantes:</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              <li>
                                <strong>Imágenes:</strong> Se recomienda usar imágenes de alta calidad con fondo blanco para mejores ventas
                              </li>
                              <li>
                                <strong>Videos:</strong> Máximo 60 segundos y 50MB de tamaño
                              </li>
                              <li>Formatos soportados: JPG, PNG, WebP para imágenes | MP4, WebM para videos</li>
                            </ul>
                          </AlertDescription>
                        </Alert>

                        {/* Validation Errors */}
                        {mediaValidationErrors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Errores de validación:</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside space-y-1 mt-2">
                                {mediaValidationErrors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Drag and Drop Area */}
                        <div
                          className={`flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg transition-colors
                            ${isDraggingOver ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-400"}
                            ${validatingImages ? "opacity-50" : ""}`}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                        >
                          <div className="text-center">
                            <div className="flex justify-center gap-4 mb-4">
                              <ImageIconLucide className="h-12 w-12 text-gray-400" />
                              <Video className="h-12 w-12 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-700 mb-2">
                              {isDraggingOver ? "¡Suelta los archivos aquí!" : "Arrastra imágenes y videos aquí"}
                            </p>
                            <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar archivos</p>
                          </div>

                          <Input
                            id="serviceMedia"
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaChange}
                            className="block w-full max-w-xs text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-orange-100 file:text-orange-700
                              hover:file:bg-orange-200
                              cursor-pointer"
                            disabled={validatingImages}
                          />

                          {validatingImages && (
                            <div className="flex items-center gap-2 text-purple-700">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Validando archivos...</span>
                            </div>
                          )}
                          {/* Error de media */}
                          {serviceFormTouched && serviceFormErrors.media && (
                            <p className="text-xs text-red-600 mt-1">{serviceFormErrors.media}</p>
                          )}
                        </div>

                        {/* Current Media Preview */}
                        {currentProductMedia.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Media actual:</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {currentProductMedia.map((media, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                                    {media.type === "image" ? (
                                      <Image
                                        src={media.url || "/placeholder.svg"}
                                        alt={`Media ${index + 1}`}
                                        layout="fill"
                                        objectFit="cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <div className="text-center">
                                          <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                          <span className="text-xs text-gray-600">Video</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                    <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveCurrentMedia(index)}
                                  >
                                    <XCircle className="h-4 w-4" />
                    </Button>
                                  <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                                    {media.type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                  </div>
                )}

                        {/* New Media Preview */}
                        {mediaPreviewUrls.length > 0 && (
                    <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Nuevos archivos seleccionados:
                      </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {mediaPreviewUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                                    {mediaFiles[index].type.startsWith("image/") ? (
                                      <Image
                                        src={url || "/placeholder.svg"}
                                        alt={`Preview ${index + 1}`}
                                        layout="fill"
                                        objectFit="cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <div className="text-center">
                                          <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                          <span className="text-xs text-gray-600">Video</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveMedia(index)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                                    {mediaFiles[index].type.startsWith("image/") ? "imagen" : "video"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {uploadingMedia && (
                          <div className="flex items-center gap-2 text-purple-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Subiendo archivos...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="serviceName" className="text-base">Nombre del Servicio</Label>
                      <Input
                        id="serviceName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                        className={serviceFormTouched && serviceFormErrors.name ? 'border-red-500' : ''}
                      />
                      {serviceFormTouched && serviceFormErrors.name && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="serviceDescription" className="text-base">Descripción</Label>
                    <Textarea
                      id="serviceDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      rows={4}
                        className={serviceFormTouched && serviceFormErrors.description ? 'border-red-500' : ''}
                      required
                    />
                      {serviceFormTouched && serviceFormErrors.description && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.description}</p>
                      )}
                  </div>
                  <div>
                      <Label htmlFor="servicePrice" className="text-base">Precio</Label>
                    <Input
                      id="servicePrice"
                      type="number"
                      step="0.01"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      required
                        className={serviceFormTouched && serviceFormErrors.price ? 'border-red-500' : ''}
                    />
                      {serviceFormTouched && serviceFormErrors.price && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.price}</p>
                      )}
                  </div>
                  <div>
                      <Label htmlFor="serviceCategory" className="text-base">Categoría</Label>
                    <Select
                      value={productCategory}
                      onValueChange={setProductCategory}
                      required
                    >
                        <SelectTrigger className={serviceFormTouched && serviceFormErrors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      {serviceFormTouched && serviceFormErrors.category && (
                        <p className="text-xs text-red-600 mt-1">{serviceFormErrors.category}</p>
                      )}
                  </div>
                  <div>
                    <Label htmlFor="serviceBrand" className="text-base">
                      Marca (Opcional)
                    </Label>
                    <Select
                      value={productBrand}
                      onValueChange={setProductBrand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={submittingProduct || validatingImages || uploadingMedia || !hasActiveSubscription}>
                    {submittingProduct ? "Guardando..." : isEditing ? "Actualizar Servicio" : "Añadir Servicio"}
                  </Button>
                </fieldset>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Chat functionality temporarily disabled */}
          {/* {activeTab === "chats" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Mis Chats</CardTitle>
                <CardDescription>Comunícate con tus clientes y resuelve sus dudas.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Funcionalidad de chat temporalmente deshabilitada</p>
                </div>
                {!currentUser?.firebaseUser.uid && <p className="text-center text-gray-500">Inicia sesión para ver tus chats.</p>}
              </CardContent>
            </Card>
          )} */}



          {activeTab === "profile" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Gestiona tu perfil y configuración de cuenta.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
                    <TabsTrigger value="subscription">Suscripción</TabsTrigger>
                    <TabsTrigger value="settings">Configuración General</TabsTrigger>
                    {/* <TabsTrigger value="mercadopago">MercadoPago</TabsTrigger>  */}
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={profileImagePreviewUrl || currentUser?.firebaseUser.photoURL || "/placeholder-user.jpg"}
                      alt="Foto de perfil"
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="block w-full max-w-xs text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-orange-100 file:text-orange-700
                        hover:file:bg-orange-200
                        cursor-pointer"
                    />
                    <Button
                      onClick={handleSaveProfileImage}
                      disabled={!profileImageFile || uploadingProfileImage}
                      className="bg-orange-600 text-white hover:bg-orange-700"
                    >
                      {uploadingProfileImage ? "Subiendo..." : "Guardar Imagen de Perfil"}
                    </Button>
                    {currentUser?.firebaseUser.photoURL && (
                      <Button
                        onClick={handleRemoveCurrentProfileImage}
                        variant="outline"
                        disabled={uploadingProfileImage}
                      >
                        Eliminar Imagen Actual
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="displayName" className="text-base">Nombre de Vendedor</Label>
                  <Input id="displayName" value={currentUser?.firebaseUser.displayName || ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-base">Email</Label>
                  <Input id="email" value={currentUser?.firebaseUser.email || ""} disabled className="mt-1" />
                </div>

                <SellerBusinessLocationCard />

                <Card className="border-dashed">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>Mercado Pago</CardTitle>
                        <CardDescription>
                          Conectá tu cuenta para cobrar ventas. En cada venta recibís el 92%; Servido retiene el 8% automáticamente.
                        </CardDescription>
                      </div>
                      <Badge variant={mercadoPagoBadgeVariant as "default" | "secondary" | "destructive"}>
                        {mercadoPagoStatusLabel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`rounded-lg border p-3 ${
                      mercadoPagoConnected
                        ? "border-green-200 bg-green-50"
                        : mercadoPagoTokenExpired
                          ? "border-red-200 bg-red-50"
                          : "border-yellow-200 bg-yellow-50"
                    }`}>
                      <p className={`text-sm font-medium ${
                        mercadoPagoConnected
                          ? "text-green-800"
                          : mercadoPagoTokenExpired
                            ? "text-red-800"
                            : "text-yellow-800"
                      }`}>
                        {mercadoPagoConnectionSummary}
                      </p>
                      {currentUser?.mercadoPagoAccountId && (
                        <p className="mt-1 text-xs text-slate-600">
                          Cuenta vinculada: {currentUser.mercadoPagoAccountId}
                        </p>
                      )}
                    </div>

                    {!mercadoPagoConnected && (
                      <Alert variant={mercadoPagoTokenExpired ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>
                          {mercadoPagoTokenExpired ? "Token vencido" : "Conexión requerida"}
                        </AlertTitle>
                        <AlertDescription>
                          {mercadoPagoTokenExpired
                            ? "Reconecta Mercado Pago para volver a cobrar ventas."
                            : "Debes conectar Mercado Pago antes de cobrar ventas de productos o servicios."}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {!mercadoPagoConnected && (
                        <Button
                          type="button"
                          onClick={handleConnectMercadoPago}
                          disabled={connectingMercadoPago}
                          className="bg-purple-900 hover:bg-purple-800"
                        >
                          {connectingMercadoPago ? "Conectando..." : mercadoPagoActionLabel}
                        </Button>
                      )}
                      {mercadoPagoConnected && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDisconnectMercadoPago}
                          disabled={disconnectingMercadoPago}
                        >
                          {disconnectingMercadoPago ? "Desconectando..." : "Desconectar"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                  </TabsContent>
                  
                  <TabsContent value="subscription" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Gestión de Suscripción</h3>
                      
                      {hasActiveSubscription ? (
                        <div className="space-y-4">
                                                     <Alert className="border-green-200 bg-green-50">
                             <CheckCircle className="h-4 w-4 text-green-600" />
                             <AlertTitle className="text-green-800">Suscripción Activa</AlertTitle>
                             <AlertDescription className="text-green-700">
                               {cancelAtPeriodEnd
                                 ? "Cancelaste la renovación automática. Seguí operando hasta el fin del período ya pagado."
                                 : "Tu suscripción mensual está activa y se renueva automáticamente. Podés crear y vender productos y servicios."}
                             </AlertDescription>
                           </Alert>
                           
                           <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                             <CardHeader>
                               <CardTitle>Estado de tu Suscripción</CardTitle>
                               <CardDescription>
                                 {cancelAtPeriodEnd
                                   ? "La adhesión en Mercado Pago ya no se renovará."
                                   : "Tu suscripción para el marketplace está activa y funcionando."}
                               </CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-3">
                               <div className="flex items-center gap-2">
                                 <CheckCircle className="h-5 w-5 text-green-600" />
                                 <span className="font-semibold">
                                   {cancelAtPeriodEnd ? "Activa hasta fin de período" : "Suscripción Activa"}
                                 </span>
                               </div>
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                  <p className="text-sm font-medium text-green-800">{subscriptionStatusSummary}</p>
                                  <p className="text-xs text-green-700">
                                    La misma suscripción habilita productos y servicios.
                                  </p>
                                </div>
                               <div className="text-sm text-gray-600">
                                 <p>• <strong>Productos:</strong> Puedes crear y gestionar productos</p>
                                 <p>• <strong>Servicios:</strong> Puedes crear y gestionar servicios</p>
                                 <p>• <strong>Pagos:</strong> Recibe pagos por tus publicaciones</p>
                                 <p>• <strong>Soporte:</strong> Acceso a soporte prioritario</p>
                               </div>
                               {!cancelAtPeriodEnd ? (
                                 <Button
                                   type="button"
                                   variant="outline"
                                   className="w-full border-red-200 text-red-700 hover:bg-red-50"
                                   disabled={cancellingSubscription}
                                   onClick={() => void handleCancelSubscription()}
                                 >
                                   {cancellingSubscription ? "Cancelando..." : "Cancelar suscripción"}
                                 </Button>
                               ) : (
                                 <div className="space-y-2">
                                   <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                     Ya cancelaste la renovación. Cuando termine el período tendrás que reactivar para seguir publicando.
                                   </div>
                                   <Button
                                     type="button"
                                     className="w-full bg-purple-700 text-white hover:bg-purple-800"
                                     disabled={subscribing}
                                     onClick={handleSubscribe}
                                   >
                                     {subscribing ? "Redirigiendo..." : "Reactivar renovación"}
                                   </Button>
                                 </div>
                               )}
                             </CardContent>
                           </Card>
                        </div>
                      ) : (
                        <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                             <AlertTitle>Suscripción Requerida</AlertTitle>
                    <AlertDescription>
                               Tu suscripción venció. Renueva para volver a publicar productos y servicios.
                    </AlertDescription>
                  </Alert>
                           
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader>
                               <CardTitle>Suscripción para el Marketplace</CardTitle>
                    <CardDescription>
                                 Activá la suscripción mensual automática para crear y ofrecer productos y servicios.
                    </CardDescription>
                  </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                  <p className="text-sm font-medium text-blue-800">{subscriptionStatusSummary}</p>
                                  <p className="text-xs text-blue-700">
                                    Se debita todos los meses con Mercado Pago. Si el cobro falla, el acceso se suspende hasta regularizar.
                                  </p>
                                </div>
                               <div className="text-sm text-gray-600">
                                 <p className="font-semibold mb-2">¿Para qué necesitas la suscripción?</p>
                                 <ul className="space-y-1">
                                   <li>• <strong>Crear productos:</strong> Publica tus productos físicos</li>
                                   <li>• <strong>Crear servicios:</strong> Publica tus servicios profesionales</li>
                                   <li>• <strong>Gestionar ofertas:</strong> Administra tus publicaciones activas</li>
                                   <li>• <strong>Acceso completo:</strong> Usa todas las herramientas de vendedor</li>
                                 </ul>
                      </div>
                               <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <p className="text-sm text-blue-800">
                                    <strong>Nota:</strong> Si falla el cobro mensual o cancelás la adhesión, se bloquean productos y servicios hasta reactivar.
                                  </p>
                                </div>
                      {/* Mostrar precio de suscripción */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Precio mensual:</span>
                          <span className="text-lg font-bold text-purple-700">
                            {loadingSubscriptionPrice ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando...
                              </span>
                            ) : subscriptionPrice ? (
                              `ARS ${subscriptionPrice.toFixed(2)}`
                            ) : (
                              'No disponible'
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Este precio puede variar según la configuración del administrador
                        </p>
                      </div>
                      
                      <Button
                        onClick={handleSubscribe}
                        disabled={subscribing}
                                 className="w-full bg-purple-700 text-white hover:bg-purple-800"
                      >
                                  {subscribing ? "Redirigiendo..." : subscriptionActionLabel}
                      </Button>
                             </CardContent>
                           </Card>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-6 mt-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">Configuración General</h3>
                      
                      {/* Configuración de formato de precios */}
                      <PriceFormatToggle 
                        onFormatChange={(useReducedDecimals) => {
                          // Aquí se puede agregar lógica adicional si es necesario
                          console.log('Formato de precios actualizado:', useReducedDecimals)
                        }}
                      />
                      
                      {/* Otras configuraciones pueden ir aquí */}
                      <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                        <CardHeader>
                          <CardTitle>Otras Configuraciones</CardTitle>
                          <CardDescription>
                            Configuraciones adicionales de la aplicación
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Más configuraciones estarán disponibles próximamente.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
                  </CardContent>
                </Card>
          )}
          {/* Earnings Tab */}
          {activeTab === "earnings" && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                <CardHeader>
                  <CardTitle>Mis Ventas</CardTitle>
                  <CardDescription>Revisa tus ventas, el estado del cobro y el neto a recibir.</CardDescription>
                </CardHeader>
              </Card>

              {/* Resumen de ventas y pagos */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Ganado</CardTitle>
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPriceNumber(commissionDistribution?.totalEarned || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingresos brutos de ventas
                    </p>
              </CardContent>
            </Card>
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Pendiente de Pago</CardTitle>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatPriceNumber(commissionDistribution?.pendingAmount || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cantidad por recibir
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Ya Pagado</CardTitle>
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPriceNumber(commissionDistribution?.paidAmount || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pagos recibidos
                    </p>
                  </CardContent>
                </Card>
              </div>

              
              <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                <CardHeader>
                  <CardTitle>Filtros de Historial</CardTitle>
                  <CardDescription>
                    Filtra tu historial de ventas y pagos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="earningsFilter">Estado de Pago</Label>
                      <Select value={earningsFilter} onValueChange={(value: 'all' | 'pendiente' | 'pagado') => setEarningsFilter(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="pagado">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="earningsDateFrom">Desde</Label>
                      <Input
                        id="earningsDateFrom"
                        type="date"
                        value={earningsDateFrom}
                        onChange={(e) => setEarningsDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="earningsDateTo">Hasta</Label>
                      <Input
                        id="earningsDateTo"
                        type="date"
                        value={earningsDateTo}
                        onChange={(e) => setEarningsDateTo(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => downloadInvoice(earningsDateFrom, earningsDateTo)}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Factura
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                <CardHeader>
                  <CardTitle>Ventas y Pagos</CardTitle>
                  <CardDescription>
                    Cada venta con su cobro, comisión y fecha de pago.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingEarnings ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
                    </div>
                  ) : visibleSellerSales.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      No hay ventas para mostrar con los filtros actuales.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">Fecha</TableHead>
                            <TableHead className="min-w-[140px]">Compra</TableHead>
                            <TableHead className="min-w-[220px]">Productos / Servicios</TableHead>
                            <TableHead className="min-w-[160px]">Comprador</TableHead>
                            <TableHead className="min-w-[120px]">Estado Pago</TableHead>
                            <TableHead className="min-w-[120px]">Bruto</TableHead>
                            <TableHead className="min-w-[120px]">Comisión</TableHead>
                            <TableHead className="min-w-[120px]">Neto</TableHead>
                            <TableHead className="min-w-[120px]">Fecha Pago</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleSellerSales.map((sale) => (
                            <TableRow key={sale.compraId}>
                              <TableCell>{formatSaleDate(sale.fechaCompra)}</TableCell>
                              <TableCell className="font-mono text-xs">{sale.compraId}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {(sale.items || []).map((item, index) => (
                                    <div key={`${sale.compraId}-${item.productoId}-${index}`} className="text-sm">
                                      <span className="font-medium">{item.productoNombre}</span>
                                      <span className="text-gray-500"> x{item.cantidad}</span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{sale.compradorNombre || "Comprador"}</div>
                                  <div className="text-xs text-gray-500">{sale.compradorId || "—"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    sale.estadoPago === "pagado"
                                      ? "default"
                                      : sale.estadoPago === "pendiente"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {sale.estadoPago}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatPriceNumber(sale.subtotalVendedor || 0)}</TableCell>
                              <TableCell>{formatPriceNumber(sale.comisionApp || 0)}</TableCell>
                              <TableCell>{formatPriceNumber(sale.montoAPagar || 0)}</TableCell>
                              <TableCell>{formatSaleDate(sale.fechaPago)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* {activeTab === "coupons" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Gestionar Cupones de Descuento</CardTitle>
                <CardDescription>Asocia cupones a tus productos y define el período de validez.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <h3 className="text-lg font-semibold">Cupones Disponibles</h3>
                {availableCoupons.length === 0 ? (
                  <p className="text-gray-500">No hay cupones activos disponibles en este momento.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descuento</TableHead>
                        <TableHead>Aplicable a</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableCoupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="font-medium">{coupon.code}</TableCell>
                          <TableCell>{coupon.name}</TableCell>
                          <TableCell>
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}%`
                              : formatPriceNumber(coupon.discountValue)}
                          </TableCell>
                          <TableCell>{coupon.applicableTo === "all" ? "Todos" : "Vendedores"}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Asociar Productos
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Asociar Cupón a Productos</DialogTitle>
                      <DialogDescription>
                        Selecciona los productos a los que deseas aplicar el cupón.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label className="text-base">Productos</Label>
                        {myProducts.length === 0 ? (
                          <p className="text-gray-500">No tienes productos para asociar.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
                            {myProducts.map((product) => (
                              <div key={product.id} className="flex items-center space-x-2 border p-3 rounded-md">
                                <Checkbox
                                  id={`product-${product.id}`}
                                  checked={selectedProductIds.includes(product.id)}
                                  onCheckedChange={(checked) =>
                                    handleProductSelection(product.id, checked === true)}
                                />
                                <label
                                  htmlFor={`product-${product.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {product.name} - {formatPrice(product.price)}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Fecha de Inicio</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal ${!couponApplyStartDate && "text-muted-foreground"}
                                `}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {couponApplyStartDate ? format(couponApplyStartDate, "PPP") : <span className="text-gray-500">Selecciona una fecha</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={couponApplyStartDate}
                                onSelect={setCouponApplyStartDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">Fecha de Fin</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal ${!couponApplyEndDate && "text-muted-foreground"}`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {couponApplyEndDate ? format(couponApplyEndDate, "PPP") : <span className="text-gray-500">Selecciona una fecha</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={couponApplyEndDate}
                                onSelect={setCouponApplyEndDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                 
                    <DialogFooter>
                      <Button
                        onClick={associateCouponToProducts}
                        disabled={associatingCoupon || selectedProductIds.length === 0 || !couponApplyStartDate || !couponApplyEndDate}
                      >
                        {associatingCoupon ? "Asociando..." : "Confirmar Asociación"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>
                        Cancelar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <h3 className="text-lg font-semibold mt-8">Mis Productos con Cupones</h3>
                {myProducts.filter(p => p.couponId).length === 0 ? (
                  <p className="text-gray-500">Aún no has asociado cupones a tus productos.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cupón</TableHead>
                        <TableHead>Válido Desde</TableHead>
                        <TableHead>Válido Hasta</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myProducts.filter(p => p.couponId).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            {availableCoupons.find(c => c.id === product.couponId)?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {product.couponStartDate ? format(new Date(product.couponStartDate.toDate()), "PPP") : "N/A"}
                          </TableCell>
                          <TableCell>
                            {product.couponEndDate ? format(new Date(product.couponEndDate.toDate()), "PPP") : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => removeCouponFromProduct(product.id)}>
                              Quitar Cupón
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )} */}

          {/* Create Coupons Tab */}
          {activeTab === "create-coupons" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Crear Cupones de Descuento</CardTitle>
                <CardDescription>Crea tus propios cupones para promocionar tus productos y servicios.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulario para crear cupón */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">Crear Nuevo Cupón</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateCoupon(); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCouponCode">Código del Cupón *</Label>
                        <Input
                          id="newCouponCode"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          placeholder="DESCUENTO20"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponName">Nombre del Cupón *</Label>
                        <Input
                          id="newCouponName"
                          value={newCouponName}
                          onChange={(e) => setNewCouponName(e.target.value)}
                          placeholder="Descuento del 20%"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newCouponDescription">Descripción (Opcional)</Label>
                      <Textarea
                        id="newCouponDescription"
                        value={newCouponDescription}
                        onChange={(e) => setNewCouponDescription(e.target.value)}
                        placeholder="Descripción del cupón..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponDiscountType">Tipo de Descuento *</Label>
                        <Select value={newCouponDiscountType} onValueChange={(value: "percentage" | "fixed") => setNewCouponDiscountType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                            <SelectItem value="fixed">Monto Fijo (ARS)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="newCouponDiscountValue">Valor del Descuento *</Label>
                        <Input
                          id="newCouponDiscountValue"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCouponDiscountValue}
                          onChange={(e) => setNewCouponDiscountValue(e.target.value)}
                          placeholder={newCouponDiscountType === "percentage" ? "20" : "10.00"}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponUsageLimit">Límite de Uso (Opcional)</Label>
                        <Input
                          id="newCouponUsageLimit"
                          type="number"
                          min="1"
                          value={newCouponUsageLimit}
                          onChange={(e) => setNewCouponUsageLimit(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCouponMinPurchase">Compra Mínima (Opcional)</Label>
                        <Input
                          id="newCouponMinPurchase"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCouponMinPurchase}
                          onChange={(e) => setNewCouponMinPurchase(e.target.value)}
                          placeholder="50.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponMaxDiscount">Descuento Máximo (Opcional)</Label>
                        <Input
                          id="newCouponMaxDiscount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCouponMaxDiscount}
                          onChange={(e) => setNewCouponMaxDiscount(e.target.value)}
                          placeholder="100.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha de Inicio (Opcional)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!newCouponStartDate && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newCouponStartDate ? format(newCouponStartDate, "PPP") : <span className="text-gray-500">Selecciona una fecha</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newCouponStartDate}
                              onSelect={setNewCouponStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha de Fin (Opcional)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!newCouponEndDate && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newCouponEndDate ? format(newCouponEndDate, "PPP") : <span className="text-gray-500">Selecciona una fecha</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newCouponEndDate}
                              onSelect={setNewCouponEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={creatingCoupon || !newCouponCode.trim() || !newCouponName.trim() || !newCouponDiscountValue}
                      className="w-full md:w-auto"
                    >
                      {creatingCoupon ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando Cupón...
                        </>
                      ) : (
                        "Crear Cupón"
                      )}
                    </Button>
                  </form>
                </div>

                {/* Lista de cupones creados */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Mis Cupones Creados</h3>
                  {myCoupons.length === 0 ? (
                    <p className="text-gray-500">Aún no has creado ningún cupón.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descuento</TableHead>
                          <TableHead>Usos</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myCoupons.map((coupon) => (
                          <TableRow key={coupon.id}>
                            <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                            <TableCell>
                              <div className="font-medium">{coupon.name}</div>
                              {coupon.description && <div className="text-xs text-gray-500">{coupon.description}</div>}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}
                              </div>
                              {coupon.minPurchase && <div className="text-xs text-gray-500">Mín: {formatPrice(coupon.minPurchase)}</div>}
                              {coupon.maxDiscount && <div className="text-xs text-gray-500">Máx: {formatPrice(coupon.maxDiscount)}</div>}
                            </TableCell>
                            <TableCell>
                              <div>{coupon.usedCount || 0} usos</div>
                              {coupon.usageLimit && <div className="text-xs text-gray-500">de {coupon.usageLimit}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={coupon.isActive ? "default" : "secondary"}>
                                {coupon.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleMyCouponActive(coupon.id, coupon.isActive)}
                                >
                                  {coupon.isActive ? "Desactivar" : "Activar"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMyCoupon(coupon.id, coupon.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "agenda" && currentUser?.firebaseUser?.uid && (
            <SellerAgendaPanel
              sellerId={currentUser.firebaseUser.uid}
              services={myProducts
                .filter((p) => p.isService)
                .map((p) => ({
                  id: p.id,
                  name: p.name,
                  serviceSchedule: p.serviceSchedule,
                }))}
              onScheduleSaved={(serviceId, schedule) => {
                setMyProducts((prev) =>
                  prev.map((p) => (p.id === serviceId ? { ...p, serviceSchedule: schedule } : p))
                )
              }}
            />
          )}

          {/* Shipping Management Tab */}
          {activeTab === "shipping" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>Gestión de Envíos</CardTitle>
                <CardDescription>Administra el estado de envío de tus productos vendidos</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tabla responsive con scroll horizontal */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Producto</TableHead>
                        <TableHead className="min-w-[80px] text-center">Cant.</TableHead>
                        <TableHead className="min-w-[140px]">Comprador</TableHead>
                        <TableHead className="min-w-[140px]">Dirección</TableHead>
                        <TableHead className="min-w-[100px] text-sm">Fecha</TableHead>
                        <TableHead className="min-w-[140px]">Estado</TableHead>
                        <TableHead className="min-w-[120px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((venta) => {
                        console.log('Venta en tabla:', venta)
                        return (
                          <TableRow key={venta.compraId + '-' + venta.productId}>
                          <TableCell className="max-w-[150px]">
                            <div className="truncate font-medium" title={venta.productName}>
                              {venta.productName || 'Producto sin nombre'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{venta.quantity}</TableCell>
                          <TableCell className="max-w-[140px]">
                            <div>
                              <div className="font-medium truncate" title={venta.compradorNombre}>
                                {venta.compradorNombre}
                              </div>
                              <div className="text-sm text-gray-500 truncate" title={venta.compradorEmail}>
                                {venta.compradorEmail}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[140px]">
                            <ShippingAddressButton
                              shippingAddress={venta.shippingAddress}
                              productName={venta.productName}
                            />
                          </TableCell>
                          <TableCell className="max-w-[100px] text-sm">
                            {(() => {
                              if (!venta.fechaCompra) return '';
                              // Si es un objeto Timestamp de Firestore
                              if (typeof venta.fechaCompra === 'object' && venta.fechaCompra._seconds) {
                                const date = new Date(venta.fechaCompra._seconds * 1000);
                                return date.toLocaleDateString();
                              }
                              // Si es un string ISO
                              if (typeof venta.fechaCompra === 'string') {
                                const date = new Date(venta.fechaCompra);
                                if (!isNaN(date.getTime())) return date.toLocaleDateString();
                              }
                              // Si es un número (timestamp en ms)
                              if (typeof venta.fechaCompra === 'number') {
                                const date = new Date(venta.fechaCompra);
                                if (!isNaN(date.getTime())) return date.toLocaleDateString();
                              }
                              return '';
                            })()}
                          </TableCell>
                          <TableCell className="max-w-[140px]">
                            <Select
                              value={shippingStates[venta.compraId + '-' + venta.productId] || 'pendiente'}
                              onValueChange={(value) => handleShippingStateChange(venta.compraId + '-' + venta.productId, value)}
                            >
                              <SelectTrigger className="w-full min-w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="preparacion">En preparación</SelectItem>
                                <SelectItem value="enviado">Enviado</SelectItem>
                                <SelectItem value="entregado">Entregado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="max-w-[120px]">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                console.log('🔘 BOTÓN CLICKEADO - Guardar Estado');
                                console.log('Venta a guardar:', venta);
                                handleSaveShippingState(venta);
                              }}
                            >
                              Guardar
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mensaje cuando no hay ventas */}
                {filteredSales.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay ventas para mostrar en este momento.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
    </SellerDashboardShell>

      {/* Notificación de suscripción */}
      {subscriptionNotification.show && (
        <SubscriptionNotification
          status={subscriptionNotification.status}
          onClose={() => setSubscriptionNotification({ show: false, status: 'success' })}
        />
      )}
    </>
  )
}



