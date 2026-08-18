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
import { useTranslations, useLocale } from "next-intl"
import { translateClientError } from "@/lib/i18n/translate-client-error"
import { getDateFnsLocale } from "@/lib/i18n/date-locale"
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
import { usePriceFormat } from "@/hooks/use-price-format"
import { SubscriptionNotification } from "@/components/subscription-notification"
import { SellerBusinessLocationCard } from "@/components/dashboard/seller-business-location-card"
import {
  SellerDashboardShell,
  type SellerDashboardTab,
} from "@/components/dashboard/seller/seller-dashboard-shell"
import { SellerAdvancedStats } from "@/components/dashboard/advanced-stats/seller-advanced-stats"
import { BuyerStatCard } from "@/components/dashboard/buyer/buyer-stat-card"
import { BuyerPanel } from "@/components/dashboard/buyer/buyer-panel"
import { SellerAgendaPanel } from "@/components/dashboard/seller/seller-agenda-panel"
import { SellerResellerProgramPanel } from "@/components/seller/seller-reseller-program-panel"
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
  allowResellerShare?: boolean
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
  const t = useTranslations("sellerDashboard")
  const tApi = useTranslations("apiErrors")
  const describeApiError = (err: unknown, fallback?: string) => {
    if (err instanceof Error) return translateClientError(err.message, tApi)
    if (typeof err === "string" && err.trim()) return translateClientError(err, tApi)
    return fallback ?? t("alerts.genericError")
  }
  const locale = useLocale()
  const { formatPrice, formatPriceNumber, updatePriceFormat } = usePriceFormat()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const dateFnsLocale = getDateFnsLocale(locale)
  const { currentUser, authLoading, handleLogout, refreshUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const hasActiveSubscription = currentUser?.subscriptionStatus === "active"
  const cancelAtPeriodEnd = Boolean(currentUser?.subscriptionCancelAtPeriodEnd)
  const subscriptionRequiredMessage = t("subscription.requiredPublish")
  const subscriptionActiveMessage = cancelAtPeriodEnd
    ? t("subscription.activeUntilPeriodEnd")
    : t("subscription.activeAutoRenew")
  const subscriptionBlockedMessage = t("subscription.blockedPublish")

  const subscriptionEndsAt = currentUser?.subscriptionEndsAt ?? null
  const subscriptionDaysRemaining = currentUser?.subscriptionDaysRemaining ?? null
  const subscriptionStatusSummary = useMemo(() => {
    if (hasActiveSubscription) {
      if (cancelAtPeriodEnd && subscriptionEndsAt) {
        return t("subscription.cancelledUntil", {
          date: subscriptionEndsAt.toLocaleDateString(dateLocale),
        })
      }

      if (subscriptionEndsAt && format(subscriptionEndsAt, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) {
        return t("subscription.chargeToday")
      }

      if (typeof subscriptionDaysRemaining === "number") {
        if (subscriptionDaysRemaining <= 0) {
          return t("subscription.chargeToday")
        }

        if (subscriptionDaysRemaining === 1) {
          return t("subscription.chargeInOneDay")
        }

        return t("subscription.chargeInDays", { days: subscriptionDaysRemaining })
      }

      return t("subscription.activeWithRenewal")
    }

    if (subscriptionEndsAt) {
      return t("subscription.expiredReactivate")
    }

    return t("subscription.activateMonthlyPrompt")
  }, [hasActiveSubscription, cancelAtPeriodEnd, subscriptionEndsAt, subscriptionDaysRemaining, t, dateLocale])
  const subscriptionActionLabel =
    subscriptionEndsAt && !hasActiveSubscription
      ? t("subscription.actionReactivate")
      : t("subscription.actionActivate")

  const mercadoPagoStatus = currentUser?.mercadoPagoStatus ?? "not_connected"
  const mercadoPagoConnected = mercadoPagoStatus === "connected"
  const mercadoPagoTokenExpired = mercadoPagoStatus === "token_expired"
  const mercadoPagoConnectionSummary = useMemo(() => {
    if (mercadoPagoConnected) {
      return t("mercadoPago.summaryConnected")
    }

    if (mercadoPagoTokenExpired) {
      return t("mercadoPago.summaryExpired")
    }

    return t("mercadoPago.summaryNotConnected")
  }, [mercadoPagoConnected, mercadoPagoTokenExpired, t])
  const mercadoPagoActionLabel = mercadoPagoConnected
    ? t("mercadoPago.connected")
    : mercadoPagoTokenExpired
      ? t("mercadoPago.reconnectAction")
      : t("mercadoPago.connectAction")
  const mercadoPagoStatusLabel = mercadoPagoConnected
    ? t("mercadoPago.statusConnected")
    : mercadoPagoTokenExpired
      ? t("mercadoPago.statusTokenExpired")
      : t("mercadoPago.statusNotConnected")
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
  const [allowResellerShare, setAllowResellerShare] = useState(false)
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
            productName: item?.productoNombre || products[item?.productoId]?.name || t("shipping.productUntitled"),
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
            productName: item.name || t("shipping.productUntitled"),
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
  }, [currentUser, t])

  // useEffect para manejar parámetros de suscripción en la URL
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (
      tab === "dashboard" ||
      tab === "stats" ||
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
        title: t("mercadoPago.toastConnectedTitle"),
        description: t("mercadoPago.toastConnectedDescription"),
      })
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('mercadopago')
      newUrl.searchParams.delete('reason')
      window.history.replaceState({}, '', newUrl.toString())
    } else if (mercadoPagoStatus === 'error') {
      toast({
        title: t("mercadoPago.toastConnectErrorTitle"),
        description:
          (mercadoPagoReason ? translateClientError(mercadoPagoReason, tApi) : null) ||
          t("mercadoPago.toastConnectErrorDefault"),
        variant: "destructive",
      })
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('mercadopago')
      newUrl.searchParams.delete('reason')
      window.history.replaceState({}, '', newUrl.toString())
    } else if (mercadoPagoStatus === 'disconnected') {
      toast({
        title: t("mercadoPago.toastDisconnectedTitle"),
        description: t("mercadoPago.toastDisconnectedDescription"),
      })
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('mercadopago')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, t])

  // Mostrar todas las ventas del vendedor sin filtros
  const filteredSales = sales;

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / rowsPerPage)
  const paginatedSales = filteredSales.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  // Exportar a Excel
  const handleExportExcel = () => {
    const data = filteredSales.map(sale => ({
      [t("earnings.excelColDate")]: sale.fechaCompra ? new Date(sale.fechaCompra).toLocaleString(dateLocale) : '',
      [t("earnings.excelColProduct")]: productsMap[sale.productId]?.name || sale.productName,
      [t("earnings.excelColPrice")]: sale.productPrice,
      [t("earnings.excelColBuyer")]: usersMap[sale.buyerId]?.name,
      [t("earnings.excelColBuyerEmail")]: usersMap[sale.buyerId]?.email,
      [t("earnings.excelColStatus")]: sale.status,
      [t("earnings.excelColPurchase")]: sale.compraId
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t("earnings.excelSheetSales"))
    XLSX.writeFile(wb, t("earnings.excelFileName"))
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
        title: t("alerts.errorTitle"),
        description: t("shipping.toastLoadError"),
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
        const statusKey = newStatus as "pending" | "preparing" | "shipped" | "delivered" | "cancelled"
        toast({
          title: t("shipping.toastUpdatedTitle"),
          description: t(`shipping.toastStatus.${statusKey}`) || t("shipping.toastUpdatedDefault"),
        })
        
        if (trackingNumber && newStatus === "shipped") {
          toast({
            title: t("shipping.toastTrackingTitle"),
            description: t("shipping.toastTrackingDescription", {
              tracking: trackingNumber,
              carrier: carrierName ? t("shipping.toastTrackingCarrierSuffix", { carrier: carrierName }) : "",
            }),
          })
        }
        
        await fetchShipments() // Recargar datos
      } else {
        toast({
          title: t("alerts.errorTitle"),
          description: (result.error ? describeApiError(result.error) : null) || t("shipping.toastUpdateError"),
          variant: "destructive",
          })
        }
      } catch (error) {
      console.error("Error updating centralized shipping status:", error)
        toast({
          title: t("alerts.errorTitle"),
        description: t("shipping.toastUpdateErrorCentralized"),
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
        const statusKey = newStatus as "pending" | "preparing" | "shipped" | "delivered" | "cancelled"
        toast({
          title: t("shipping.toastUpdatedTitle"),
          description: t(`shipping.toastStatus.${statusKey}`) || t("shipping.toastUpdatedDefault"),
        })
        
        if (trackingNumber && newStatus === "shipped") {
          toast({
            title: t("shipping.toastTrackingTitle"),
            description: t("shipping.toastTrackingDescription", {
              tracking: trackingNumber,
              carrier: carrierName ? t("shipping.toastTrackingCarrierSuffix", { carrier: carrierName }) : "",
            }),
          })
        }
        
        await fetchShipments() // Recargar datos
      } else {
        toast({
          title: t("alerts.errorTitle"),
          description: (result.error ? describeApiError(result.error) : null) || t("shipping.toastUpdateError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating shipping status:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("shipping.toastUpdateErrorGeneric"),
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
    const key = status as "pending" | "preparing" | "shipped" | "delivered" | "cancelled"
    if (key === "pending" || key === "preparing" || key === "shipped" || key === "delivered" || key === "cancelled") {
      return t(`shipping.status.${key}`)
    }
    return t("shipping.statusUnknown")
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
          title: t("alerts.errorTitle"),
          description: t("coupons.availableLoadError"),
          variant: "destructive",
        })
      }
    }
    fetchCoupons()
  }, [toast, t])

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
    if ((activeTab === "shipping" || activeTab === "stats") && currentUser) {
      fetchShipments()
    }
  }, [activeTab, currentUser])

  useEffect(() => {
    const currentUid = currentUser?.firebaseUser.uid
    if ((activeTab === "earnings" || activeTab === "stats") && currentUid && earningsLoadedForUid !== currentUid) {
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
      setError(t("products.loadError"))
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
        title: t("alerts.errorTitle"),
        description: t("coupons.associateSelectRequired"),
        variant: "destructive",
      })
      return
    }

    if (!couponApplyStartDate || !couponApplyEndDate) {
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.associateDateRangeRequired"),
        variant: "destructive",
      })
      return
    }

    if (couponApplyStartDate > couponApplyEndDate) {
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.associateDateOrderInvalid"),
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
        title: t("alerts.successTitle"),
        description: t("coupons.associateSuccess", { count: selectedProductIds.length }),
      })
    } catch (error) {
      console.error("Error associating coupon to products:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.associateError"),
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
        title: t("alerts.successTitle"),
        description: t("coupons.removeFromProductSuccess"),
      })
    } catch (error) {
      console.error("Error removing coupon from product:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.removeFromProductError"),
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
        title: t("alerts.errorTitle"),
        description: t("coupons.loadError"),
        variant: "destructive",
      })
    }
  }

  const handleCreateCoupon = async () => {
    if (!currentUser) return

    if (newCouponCode.trim() === "") {
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.codeEmpty"),
        variant: "destructive",
      })
      return
    }
    if (newCouponName.trim() === "") {
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.nameEmpty"),
        variant: "destructive",
      })
      return
    }
    if (!newCouponDiscountValue || parseFloat(newCouponDiscountValue) <= 0) {
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.valueInvalid"),
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
        title: t("alerts.successTitle"),
        description: t("coupons.createdSuccess"),
      })
    } catch (error) {
      console.error("Error creating coupon:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.createError"),
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
        title: t("alerts.successTitle"),
        description: !currentStatus ? t("coupons.toggledActive") : t("coupons.toggledInactive"),
      })
    } catch (error) {
      console.error("Error updating coupon status:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.updateError"),
        variant: "destructive",
      })
    }
  }

  const handleDeleteMyCoupon = async (couponId: string, couponName: string) => {
    if (!window.confirm(t("coupons.deleteConfirm", { name: couponName }))) {
      return
    }
    try {
      await deleteDoc(doc(db, "coupons", couponId))
      setMyCoupons(prev => prev.filter(coupon => coupon.id !== couponId))
      toast({
        title: t("alerts.successTitle"),
        description: t("coupons.deletedSuccess"),
      })
    } catch (error) {
      console.error("Error deleting coupon:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("coupons.deleteError"),
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
      setError(t("catalog.categoriesLoadError"))
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
    if (!currentUser) throw new Error(t("forms.notAuthenticated"))
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
      throw new Error(t("forms.mediaUploadError"))
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
    setAllowResellerShare(false)
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
    setAllowResellerShare(Boolean(product.allowResellerShare))
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
    if (!window.confirm(t("products.deleteConfirm"))) {
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
      setSuccessMessage(t("products.deletedSuccess"))
    } catch (err) {
      console.error("Error deleting product:", err)
      setError(t("products.deleteError"))
    }
  }

  // Nueva función de validación para productos
  const validateProductForm = () => {
    const errors: {[key:string]:string} = {}
    if (!productName.trim()) errors.name = t("forms.validation.nameRequired")
    if (!productDescription.trim()) errors.description = t("forms.validation.descriptionRequired")
    if (!productPrice || isNaN(Number(productPrice)) || Number(productPrice) <= 0)
      errors.price = t("forms.validation.priceRequired")
    if (!productCategory) errors.category = t("forms.validation.categoryRequired")
    if (!productIsService && (!productStock || isNaN(Number(productStock)) || Number(productStock) < 0))
      errors.stock = t("forms.validation.stockRequired")
    if (mediaFiles.length === 0 && currentProductMedia.length === 0)
      errors.media = t("forms.validation.mediaRequired")
    if (!productCondition) errors.condition = t("forms.validation.conditionRequired")
    if (!freeShipping && (!shippingCost || isNaN(Number(shippingCost)) || Number(shippingCost) < 0))
      errors.shippingCost = t("forms.validation.shippingCostRequired")
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
      setError(t("forms.fixErrors"))
      return
    }

    if (!productName || !productPrice || !productCategory || !currentUser) {
      setError(t("forms.namePriceCategoryRequired"))
      return
    }

    if (mediaFiles.length === 0 && currentProductMedia.length === 0) {
      setError(t("productForm.needMedia"))
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
        allowResellerShare: !productIsService && allowResellerShare,
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
        setSuccessMessage(t("productForm.updatedSuccess"))
      } else {
        const productDataWithTimestamp = { ...productData, createdAt: serverTimestamp() }
        const docRef = await addDoc(collection(db, "products"), productDataWithTimestamp)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...productDataWithTimestamp, createdAt: new Date(), updatedAt: new Date() } as Product,
          ...prevProducts,
        ])
        setSuccessMessage(t("productForm.addedSuccess"))
      }
      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error submitting product:", err)
      setError(
        isEditing
          ? t("forms.productSubmitErrorUpdate", {
              message: describeApiError(err, ""),
            })
          : t("forms.productSubmitErrorAdd", {
              message: describeApiError(err, ""),
            }),
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
    if (!currentUser) throw new Error(t("forms.notAuthenticated"))
    setUploadingProfileImage(true)
    const filePath = `users/${currentUser.firebaseUser.uid}/profile/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)
    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return { downloadURL, filePath }
    } catch (error) {
      console.error("Error uploading profile image: ", error)
      throw new Error(t("forms.profileImageUploadError"))
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
      setError(t("profile.selectImageRequired"))
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

      setSuccessMessage(t("profile.photoUpdatedSuccess"))
      setProfileImageFile(null)
    } catch (err) {
      console.error("Error saving profile image:", err)
      setError(
        t("profile.photoUpdateError", {
          message: describeApiError(err, ""),
        })
      )
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const handleRemoveCurrentProfileImage = async () => {
    if (!currentUser) {
      setError(t("subscription.noAuth"))
      return
    }
    if (!currentUser.photoPath) {
      setError(t("profile.noPhotoToRemove"))
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

      setSuccessMessage(t("profile.photoRemovedSuccess"))
      setProfileImageFile(null)
      setProfileImagePreviewUrl(null)
    } catch (err) {
      console.error("Error removing profile image:", err)
      setError(
        t("profile.photoRemoveError", {
          message: describeApiError(err),
        })
      )
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
      toast({ title: t("alerts.errorTitle"), description: t("subscription.noAuth"), variant: 'destructive' });
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
        toast({ title: t("alerts.errorTitle"), description: t("subscription.noInitPoint"), variant: 'destructive' });
      }
    } catch (err) {
      console.error("[handleSubscribe] Error en la suscripción:", err);
      toast({ title: t("alerts.errorTitle"), description: describeApiError(err), variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentUser) {
      toast({ title: t("alerts.errorTitle"), description: t("subscription.noAuth"), variant: "destructive" })
      return
    }

    const confirmed = window.confirm(t("subscription.cancelConfirm"))
    if (!confirmed) return

    setCancellingSubscription(true)
    try {
      const response = await ApiService.cancelSubscription()
      if (response.error) throw new Error(response.error)

      await refreshUserProfile()

      if (response.data?.immediate) {
        toast({
          title: t("subscription.cancelImmediateTitle"),
          description: t("subscription.cancelImmediateDescription"),
        })
      } else if (response.data?.accessUntil) {
        toast({
          title: t("subscription.cancelUntilTitle"),
          description: t("subscription.cancelUntilDescription", {
            date: format(new Date(response.data.accessUntil), "dd/MM/yyyy"),
          }),
          duration: 6000,
        })
      } else {
        toast({
          title: t("subscription.cancelImmediateTitle"),
          description: t("subscription.cancelDefaultDescription"),
        })
      }
    } catch (err) {
      toast({
        title: t("alerts.errorTitle"),
        description: describeApiError(err, t("subscription.cancelError")),
        variant: "destructive",
      })
    } finally {
      setCancellingSubscription(false)
    }
  };

  const handleConnectMercadoPago = async () => {
    if (!currentUser) {
      toast({ title: t("alerts.errorTitle"), description: t("subscription.noAuth"), variant: "destructive" })
      return
    }

    setConnectingMercadoPago(true)
    try {
      const response = await ApiService.startMercadoPagoConnection()
      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.authorizationUrl) {
        throw new Error(t("mercadoPago.noAuthUrl"))
      }

      window.location.href = response.data.authorizationUrl
    } catch (err) {
      const message = describeApiError(err)
      toast({ title: t("alerts.errorTitle"), description: message, variant: "destructive" })
    } finally {
      setConnectingMercadoPago(false)
    }
  }

  const handleDisconnectMercadoPago = async () => {
    if (!currentUser) {
      toast({ title: t("alerts.errorTitle"), description: t("subscription.noAuth"), variant: "destructive" })
      return
    }

    const shouldDisconnect = window.confirm(t("mercadoPago.disconnectConfirm"))
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
      toast({
        title: t("mercadoPago.toastDisconnectedTitle"),
        description: t("mercadoPago.toastDisconnectedDescription"),
      })
    } catch (err) {
      const message = describeApiError(err)
      toast({ title: t("alerts.errorTitle"), description: message, variant: "destructive" })
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
    if (!productName.trim()) errors.name = t("forms.validation.nameRequired")
    if (!productDescription.trim()) errors.description = t("forms.validation.descriptionRequired")
    if (!productPrice || isNaN(Number(productPrice)) || Number(productPrice) <= 0)
      errors.price = t("forms.validation.priceRequired")
    if (!productCategory) errors.category = t("forms.validation.categoryRequired")
    if (mediaFiles.length === 0 && currentProductMedia.length === 0)
      errors.media = t("forms.validation.mediaRequired")
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
      setError(t("forms.fixErrors"))
      return
    }

    if (!productName || !productPrice || !productCategory || !currentUser) {
      setError(t("forms.namePriceCategoryRequired"))
      return
    }

    if (mediaFiles.length === 0 && currentProductMedia.length === 0) {
      setError(t("serviceForm.needMedia"))
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
        setSuccessMessage(t("serviceForm.updatedSuccess"))
      } else {
        const serviceDataWithTimestamp = { ...serviceData, createdAt: serverTimestamp() }
        const docRef = await addDoc(collection(db, "products"), serviceDataWithTimestamp)
        setMyProducts((prevProducts) => [
          { id: docRef.id, ...serviceDataWithTimestamp, createdAt: new Date(), updatedAt: new Date() } as Product,
          ...prevProducts,
        ])
        setSuccessMessage(t("serviceForm.addedSuccess"))
      }
      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error submitting service:", err)
      setError(
        isEditing
          ? t("forms.serviceSubmitErrorUpdate", {
              message: describeApiError(err, ""),
            })
          : t("forms.serviceSubmitErrorAdd", {
              message: describeApiError(err, ""),
            }),
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
      setError(t("earnings.loadError"))
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
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString(dateLocale)
    }

    if (typeof value === "number") {
      const date = new Date(value)
      return isNaN(date.getTime()) ? "—" : date.toLocaleDateString(dateLocale)
    }

    if (typeof value === "string") {
      const date = new Date(value)
      return isNaN(date.getTime()) ? value : date.toLocaleDateString(dateLocale)
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
        [
          t("earnings.csvHeaders.date"),
          t("earnings.csvHeaders.purchaseId"),
          t("earnings.csvHeaders.products"),
          t("earnings.csvHeaders.subtotal"),
          t("earnings.csvHeaders.commission"),
          t("earnings.csvHeaders.net"),
          t("earnings.csvHeaders.status"),
        ],
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
      
      const vendorName = currentUser.firebaseUser.displayName || t("earnings.invoiceVendorDefault")
      const dateRange =
        startDate && endDate ? `${startDate}-${endDate}` : t("earnings.invoiceDateRangeAll")
      a.download = t("earnings.invoiceFileName", { vendor: vendorName, range: dateRange })
      a.click()
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error("Error generating invoice:", err)
      setError(t("earnings.invoiceError"))
    }
  }

  const paymentStatusLabel = (estado: string) => {
    if (estado === "pendiente" || estado === "pagado") {
      return t(`earnings.paymentStatus.${estado}`)
    }
    return estado
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
          title: t("alerts.errorTitle"),
          description: t("shipping.toastPurchaseNotFound"),
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
          title: t("alerts.errorTitle"),
          description: t("shipping.toastProductNotFound"),
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
        title: t("shipping.toastSavedTitle"),
        description: t("shipping.toastSavedDescription", { name: venta.productName }),
        variant: 'default',
      });
      
      // Recargar los datos de ventas para mostrar el cambio
      if (currentUser) {
        fetchSellerData(currentUser.firebaseUser.uid);
      }
      
    } catch (err) {
      console.error('Error actualizando estado de envío:', err);
      toast({
        title: t("shipping.toastSaveErrorTitle"),
        description: t("shipping.toastSaveErrorDescription", {
          message: describeApiError(err, t("shipping.statusUnknown")),
        }),
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
              <AlertTitle>{t("alerts.errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert className="mb-4 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>{t("alerts.successTitle")}</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {activeTab === "stats" && (
            <SellerAdvancedStats
              sales={sellerSales}
              products={myProducts}
              shipments={[...shipments, ...centralizedShipments]}
            />
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
                    {mercadoPagoTokenExpired ? t("mercadoPago.reconnectTitle") : t("mercadoPago.connectTitle")}
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
                        {connectingMercadoPago ? t("mercadoPago.connecting") : mercadoPagoActionLabel}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <BuyerStatCard title={t("overview.publishedProducts")} value={myProducts.length} icon={ShoppingBag} />
                <BuyerStatCard
                  title={t("overview.catalogValue")}
                  value={formatPriceNumber(totalProductsValue)}
                  icon={ListFilter}
                  accent="green"
                />
                <BuyerStatCard title={t("overview.totalShipments")} value={shippingStats.total} icon={Truck} accent="amber" />
              </div>

              <BuyerPanel title={t("overview.shippingDetailTitle")} description={t("overview.shippingDetailDesc")}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{shippingStats.pending}</p>
                    <p className="text-sm text-gray-500">{t("overview.pending")}</p>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{shippingStats.shipped}</p>
                    <p className="text-sm text-gray-500">{t("overview.shipped")}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{shippingStats.delivered}</p>
                    <p className="text-sm text-gray-500">{t("overview.delivered")}</p>
                  </div>
                </div>
              </BuyerPanel>
            </div>
          )}

          {/* Products Tab - Updated to show media */}
          {activeTab === "products" && (
            <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
              <CardHeader>
                <CardTitle>{t("products.title")}</CardTitle>
                <CardDescription>{t("products.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
                  </div>
                ) : myProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-lg text-muted-foreground mb-6">{t("products.empty")}</p>
                    <Button
                      onClick={() => {
                        resetForm()
                        setActiveTab("addProduct")
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> {t("products.publishFirst")}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">{t("products.colMedia")}</TableHead>
                            <TableHead>{t("products.colName")}</TableHead>
                            <TableHead>{t("products.colPrice")}</TableHead>
                            <TableHead>{t("products.colType")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("products.colStock")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("products.colActions")}</TableHead>
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
                              <TableCell>{prod.isService ? t("products.typeService") : t("products.typeProduct")}</TableCell>
                              <TableCell className="text-center hidden md:table-cell">{prod.isService ? t("products.stockNa") : (prod.stock ?? 0)}</TableCell>
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
                                    title={t("products.storyTitle")}
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
                <CardTitle>{isEditing ? t("productForm.editTitle") : t("productForm.addTitle")}</CardTitle>
                <CardDescription>
                  {isEditing ? t("productForm.editDescription") : t("productForm.addDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSubscriptionGate()}
                {/* Resumen de errores */}
                {productFormTouched && Object.keys(productFormErrors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("forms.missingRequiredTitle")}</AlertTitle>
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
                      {t("media.productLabel")}
                    </Label>
                    <div className="mt-2 space-y-4">
                      {/* Validation Requirements */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">{t("forms.requirementsTitle")}</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                              <li><strong>{t("media.reqImages")}</strong></li>
                              <li><strong>{t("media.reqVideos")}</strong></li>
                            <li>{t("media.reqFormats")}</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      {/* Validation Errors */}
                      {mediaValidationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>{t("forms.validationErrorsTitle")}</AlertTitle>
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
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{t("media.newFiles")}</Label>
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
                                        <span className="text-xs text-gray-600">{t("media.video")}</span>
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
                                  {mediaFiles[index].type.startsWith("image/") ? t("media.imageBadge") : t("media.videoBadge")}
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
                            <span className="text-sm">{t("media.validating")}</span>
                        </div>
                      )}
                        {/* Error de media */}
                        {productFormTouched && productFormErrors.media && (
                          <p className="text-xs text-red-600 mt-1">{productFormErrors.media}</p>
                      )}
                    </div>
                  </div>

                  <div>
                      <Label htmlFor="productName" className="text-base">{t("productForm.name")}</Label>
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
                      <Label htmlFor="productDescription" className="text-base">{t("productForm.description")}</Label>
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
                        <Label htmlFor="productPrice" className="text-base">{t("productForm.price")}</Label>
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
                          <Label htmlFor="productStock" className="text-base">{t("productForm.stock")}</Label>
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
                        <Label htmlFor="productCategory" className="text-base">{t("productForm.category")}</Label>
                      <Select value={productCategory} onValueChange={setProductCategory} required>
                          <SelectTrigger className={productFormTouched && productFormErrors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder={t("productForm.categoryPlaceholder")} />
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
                        {t("productForm.brandOptional")}
                      </Label>
                      <Select value={productBrand} onValueChange={setProductBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("productForm.brandPlaceholder")} />
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
                    <Label htmlFor="productCondition" className="text-base">{t("productForm.condition")}</Label>
                    <Select value={productCondition} onValueChange={v => setProductCondition(v as 'nuevo' | 'usado')} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("productForm.conditionPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">{t("productForm.conditionNew")}</SelectItem>
                        <SelectItem value="usado">{t("productForm.conditionUsed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {productFormTouched && productFormErrors.condition && (
                      <p className="text-xs text-red-600 mt-1">{productFormErrors.condition}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-base">{t("productForm.shipping")}</Label>
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id="freeShipping"
                        checked={freeShipping}
                        onChange={e => setFreeShipping(e.target.checked)}
                        className="mr-2"
                      />
                      <Label htmlFor="freeShipping" className="text-sm">{t("productForm.freeShipping")}</Label>
                    </div>
                    {!productIsService && (
                      <div className="mt-4 space-y-2 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="allowResellerShare"
                            checked={allowResellerShare}
                            onCheckedChange={(v) => setAllowResellerShare(v === true)}
                          />
                          <div>
                            <Label htmlFor="allowResellerShare" className="text-sm font-medium">
                              {t("productForm.allowResellerShare")}
                            </Label>
                            <p className="text-xs text-muted-foreground">{t("productForm.allowResellerShareHint")}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {!freeShipping && (
                      <div>
                        <Input
                          id="shippingCost"
                          type="number"
                          step="0.01"
                          value={shippingCost}
                          onChange={e => setShippingCost(e.target.value)}
                          placeholder={t("productForm.shippingCostPlaceholder")}
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
                          {t("productForm.saving")}
                        </>
                      ) : isEditing ? (
                        t("productForm.submitUpdate")
                      ) : (
                        t("productForm.submitAdd")
                      )}
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetForm} disabled={submittingProduct}>
                      {t("productForm.cancel")}
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
                <CardTitle>{isEditing ? t("serviceForm.editTitle") : t("serviceForm.addTitle")}</CardTitle>
                <CardDescription>
                  {isEditing ? t("serviceForm.editDescription") : t("serviceForm.addDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Notificación de suscripción */}
                {renderSubscriptionGate()}
                {/* Resumen de errores */}
                {serviceFormTouched && Object.keys(serviceFormErrors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("forms.missingRequiredTitle")}</AlertTitle>
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
                      <Label htmlFor="serviceMedia" className="text-base">{t("media.serviceLabel")}</Label>
                      <div className="mt-2 space-y-4">
                        {/* Validation Requirements */}
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">{t("forms.requirementsTitle")}</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              <li><strong>{t("media.reqImages")}</strong></li>
                              <li><strong>{t("media.reqVideos")}</strong></li>
                              <li>{t("media.reqFormats")}</li>
                            </ul>
                          </AlertDescription>
                        </Alert>

                        {/* Validation Errors */}
                        {mediaValidationErrors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t("forms.validationErrorsTitle")}</AlertTitle>
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
                              {isDraggingOver ? t("media.dropHere") : t("media.dragHere")}
                            </p>
                            <p className="text-sm text-gray-500 mb-4">{t("media.orClick")}</p>
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
                              <span className="text-sm">{t("media.validating")}</span>
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
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{t("media.currentMedia")}</Label>
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
                                          <span className="text-xs text-gray-600">{t("media.video")}</span>
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
                              {t("media.newFiles")}
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
                                          <span className="text-xs text-gray-600">{t("media.video")}</span>
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
                                    {mediaFiles[index].type.startsWith("image/") ? t("media.imageBadge") : t("media.videoBadge")}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {uploadingMedia && (
                          <div className="flex items-center gap-2 text-purple-700">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">{t("media.uploading")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="serviceName" className="text-base">{t("serviceForm.name")}</Label>
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
                      <Label htmlFor="serviceDescription" className="text-base">{t("serviceForm.description")}</Label>
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
                      <Label htmlFor="servicePrice" className="text-base">{t("serviceForm.price")}</Label>
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
                      <Label htmlFor="serviceCategory" className="text-base">{t("serviceForm.category")}</Label>
                    <Select
                      value={productCategory}
                      onValueChange={setProductCategory}
                      required
                    >
                        <SelectTrigger className={serviceFormTouched && serviceFormErrors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t("serviceForm.categoryPlaceholder")} />
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
                      {t("serviceForm.brandOptional")}
                    </Label>
                    <Select
                      value={productBrand}
                      onValueChange={setProductBrand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("serviceForm.brandPlaceholder")} />
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
                    {submittingProduct
                      ? t("serviceForm.saving")
                      : isEditing
                        ? t("serviceForm.submitUpdate")
                        : t("serviceForm.submitAdd")}
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
                <CardTitle>{t("profile.cardTitle")}</CardTitle>
                <CardDescription>{t("profile.cardDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile">{t("profile.tabProfile")}</TabsTrigger>
                    <TabsTrigger value="subscription">{t("profile.tabSubscription")}</TabsTrigger>
                    <TabsTrigger value="settings">{t("profile.tabSettings")}</TabsTrigger>
                    {/* <TabsTrigger value="mercadopago">MercadoPago</TabsTrigger>  */}
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={profileImagePreviewUrl || currentUser?.firebaseUser.photoURL || "/placeholder-user.jpg"}
                      alt={t("profile.photoAlt")}
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
                      {uploadingProfileImage ? t("profile.uploadingPhoto") : t("profile.savePhoto")}
                    </Button>
                    {currentUser?.firebaseUser.photoURL && (
                      <Button
                        onClick={handleRemoveCurrentProfileImage}
                        variant="outline"
                        disabled={uploadingProfileImage}
                      >
                        {t("profile.removePhoto")}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="displayName" className="text-base">{t("profile.displayName")}</Label>
                  <Input id="displayName" value={currentUser?.firebaseUser.displayName || ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-base">{t("profile.email")}</Label>
                  <Input id="email" value={currentUser?.firebaseUser.email || ""} disabled className="mt-1" />
                </div>

                <SellerBusinessLocationCard />

                <Card className="border-dashed">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>{t("profile.mpTitle")}</CardTitle>
                        <CardDescription>
                          {t("mercadoPago.profileDescription")}
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
                          {t("mercadoPago.linkedAccount", { accountId: currentUser.mercadoPagoAccountId })}
                        </p>
                      )}
                    </div>

                    {!mercadoPagoConnected && (
                      <Alert variant={mercadoPagoTokenExpired ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>
                          {mercadoPagoTokenExpired ? t("mercadoPago.alertTokenExpiredTitle") : t("mercadoPago.alertConnectionRequiredTitle")}
                        </AlertTitle>
                        <AlertDescription>
                          {mercadoPagoTokenExpired
                            ? t("mercadoPago.alertTokenExpiredDescription")
                            : t("mercadoPago.alertConnectionRequiredDescription")}
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
                          {connectingMercadoPago ? t("mercadoPago.connecting") : mercadoPagoActionLabel}
                        </Button>
                      )}
                      {mercadoPagoConnected && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDisconnectMercadoPago}
                          disabled={disconnectingMercadoPago}
                        >
                          {disconnectingMercadoPago ? t("mercadoPago.disconnecting") : t("mercadoPago.disconnect")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                  </TabsContent>
                  
                  <TabsContent value="subscription" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t("profile.subscriptionManageTitle")}</h3>
                      
                      {hasActiveSubscription ? (
                        <div className="space-y-4">
                                                     <Alert className="border-green-200 bg-green-50">
                             <CheckCircle className="h-4 w-4 text-green-600" />
                             <AlertTitle className="text-green-800">{t("profile.subscriptionActiveTitle")}</AlertTitle>
                             <AlertDescription className="text-green-700">
                               {cancelAtPeriodEnd
                                 ? t("profile.subscriptionActiveDescCancelled")
                                 : t("profile.subscriptionActiveDescRenewal")}
                             </AlertDescription>
                           </Alert>
                           
                           <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                             <CardHeader>
                               <CardTitle>{t("profile.statusCardTitle")}</CardTitle>
                               <CardDescription>
                                 {cancelAtPeriodEnd
                                   ? t("profile.statusCardDescCancelled")
                                   : t("profile.statusCardDescActive")}
                               </CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-3">
                               <div className="flex items-center gap-2">
                                 <CheckCircle className="h-5 w-5 text-green-600" />
                                 <span className="font-semibold">
                                   {cancelAtPeriodEnd ? t("profile.statusLabelUntilPeriod") : t("profile.statusLabelActive")}
                                 </span>
                               </div>
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                  <p className="text-sm font-medium text-green-800">{subscriptionStatusSummary}</p>
                                  <p className="text-xs text-green-700">
                                    {t("profile.sameSubscriptionNote")}
                                  </p>
                                </div>
                               <div className="text-sm text-gray-600">
                                 <p>• {t("profile.benefitProducts")}</p>
                                 <p>• {t("profile.benefitServices")}</p>
                                 <p>• {t("profile.benefitPayments")}</p>
                                 <p>• {t("profile.benefitSupport")}</p>
                               </div>
                               {!cancelAtPeriodEnd ? (
                                 <Button
                                   type="button"
                                   variant="outline"
                                   className="w-full border-red-200 text-red-700 hover:bg-red-50"
                                   disabled={cancellingSubscription}
                                   onClick={() => void handleCancelSubscription()}
                                 >
                                   {cancellingSubscription ? t("subscription.cancelling") : t("subscription.cancelButton")}
                                 </Button>
                               ) : (
                                 <div className="space-y-2">
                                   <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                     {t("profile.cancelledPeriodNote")}
                                   </div>
                                   <Button
                                     type="button"
                                     className="w-full bg-purple-700 text-white hover:bg-purple-800"
                                     disabled={subscribing}
                                     onClick={handleSubscribe}
                                   >
                                     {subscribing ? t("subscription.redirecting") : t("subscription.reactivateRenewal")}
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
                             <AlertTitle>{t("profile.requiredTitle")}</AlertTitle>
                    <AlertDescription>
                               {t("profile.requiredDescription")}
                    </AlertDescription>
                  </Alert>
                           
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader>
                               <CardTitle>{t("profile.marketplaceTitle")}</CardTitle>
                    <CardDescription>
                                 {t("profile.marketplaceDescription")}
                    </CardDescription>
                  </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                  <p className="text-sm font-medium text-blue-800">{subscriptionStatusSummary}</p>
                                  <p className="text-xs text-blue-700">
                                    {t("profile.mpDebitNote")}
                                  </p>
                                </div>
                               <div className="text-sm text-gray-600">
                                 <p className="font-semibold mb-2">{t("profile.whySubscriptionTitle")}</p>
                                 <ul className="space-y-1">
                                   <li>• {t("profile.whyCreateProducts")}</li>
                                   <li>• {t("profile.whyCreateServices")}</li>
                                   <li>• {t("profile.whyManageOffers")}</li>
                                   <li>• {t("profile.whyFullAccess")}</li>
                                 </ul>
                      </div>
                               <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <p className="text-sm text-blue-800">
                                    {t("profile.blockedNote")}
                                  </p>
                                </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{t("profile.monthlyPrice")}</span>
                          <span className="text-lg font-bold text-purple-700">
                            {loadingSubscriptionPrice ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("profile.priceLoading")}
                              </span>
                            ) : subscriptionPrice ? (
                              `ARS ${subscriptionPrice.toFixed(2)}`
                            ) : (
                              t("profile.priceUnavailable")
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("profile.priceAdminNote")}
                        </p>
                      </div>
                      
                      <Button
                        onClick={handleSubscribe}
                        disabled={subscribing}
                                 className="w-full bg-purple-700 text-white hover:bg-purple-800"
                      >
                                  {subscribing ? t("subscription.redirecting") : subscriptionActionLabel}
                      </Button>
                             </CardContent>
                           </Card>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-6 mt-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">{t("profile.settingsTitle")}</h3>
                      
                      <PriceFormatToggle onFormatChange={updatePriceFormat} />
                      
                      <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                        <CardHeader>
                          <CardTitle>{t("profile.otherSettingsTitle")}</CardTitle>
                          <CardDescription>
                            {t("profile.otherSettingsDescription")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            {t("profile.settingsComingSoon")}
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
                  <CardTitle>{t("earnings.title")}</CardTitle>
                  <CardDescription>{t("earnings.description")}</CardDescription>
                </CardHeader>
              </Card>

              {/* Resumen de ventas y pagos */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">{t("earnings.statTotal")}</CardTitle>
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPriceNumber(commissionDistribution?.totalEarned || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("earnings.statTotalHint")}</p>
              </CardContent>
            </Card>
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">{t("earnings.statPending")}</CardTitle>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatPriceNumber(commissionDistribution?.pendingAmount || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("earnings.statPendingHint")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">{t("earnings.statPaid")}</CardTitle>
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPriceNumber(commissionDistribution?.paidAmount || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("earnings.statPaidHint")}</p>
                  </CardContent>
                </Card>
              </div>

              
              <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                <CardHeader>
                  <CardTitle>{t("earnings.filtersTitle")}</CardTitle>
                  <CardDescription>{t("earnings.filtersDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="earningsFilter">{t("earnings.filterPaymentStatus")}</Label>
                      <Select value={earningsFilter} onValueChange={(value: 'all' | 'pendiente' | 'pagado') => setEarningsFilter(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("earnings.filterAll")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("earnings.filterAll")}</SelectItem>
                          <SelectItem value="pendiente">{t("earnings.filterPending")}</SelectItem>
                          <SelectItem value="pagado">{t("earnings.filterPaid")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="earningsDateFrom">{t("earnings.dateFrom")}</Label>
                      <Input
                        id="earningsDateFrom"
                        type="date"
                        value={earningsDateFrom}
                        onChange={(e) => setEarningsDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="earningsDateTo">{t("earnings.dateTo")}</Label>
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
                        {t("earnings.downloadInvoice")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-purple-100/80 shadow-sm shadow-purple-900/5">
                <CardHeader>
                  <CardTitle>{t("earnings.salesTableTitle")}</CardTitle>
                  <CardDescription>{t("earnings.salesTableDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingEarnings ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
                    </div>
                  ) : visibleSellerSales.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      {t("earnings.emptyFiltered")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">{t("earnings.colDate")}</TableHead>
                            <TableHead className="min-w-[140px]">{t("earnings.colPurchase")}</TableHead>
                            <TableHead className="min-w-[220px]">{t("earnings.colProducts")}</TableHead>
                            <TableHead className="min-w-[160px]">{t("earnings.colBuyer")}</TableHead>
                            <TableHead className="min-w-[120px]">{t("earnings.colPaymentStatus")}</TableHead>
                            <TableHead className="min-w-[120px]">{t("earnings.colGross")}</TableHead>
                            <TableHead className="min-w-[120px]">{t("earnings.colCommission")}</TableHead>
                            <TableHead className="min-w-[120px]">{t("earnings.colNet")}</TableHead>
                            <TableHead className="min-w-[120px]">{t("earnings.colPaymentDate")}</TableHead>
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
                                  <div className="font-medium">{sale.compradorNombre || t("earnings.buyerDefault")}</div>
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
                                  {paymentStatusLabel(sale.estadoPago)}
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
                <CardTitle>{t("coupons.title")}</CardTitle>
                <CardDescription>{t("coupons.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">{t("coupons.formTitle")}</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateCoupon(); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCouponCode">{t("coupons.codeLabel")}</Label>
                        <Input
                          id="newCouponCode"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          placeholder={t("coupons.codePlaceholder")}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponName">{t("coupons.nameLabel")}</Label>
                        <Input
                          id="newCouponName"
                          value={newCouponName}
                          onChange={(e) => setNewCouponName(e.target.value)}
                          placeholder={t("coupons.namePlaceholder")}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newCouponDescription">{t("coupons.descriptionLabel")}</Label>
                      <Textarea
                        id="newCouponDescription"
                        value={newCouponDescription}
                        onChange={(e) => setNewCouponDescription(e.target.value)}
                        placeholder={t("coupons.descriptionPlaceholder")}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponDiscountType">{t("coupons.discountTypeLabel")}</Label>
                        <Select value={newCouponDiscountType} onValueChange={(value: "percentage" | "fixed") => setNewCouponDiscountType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">{t("coupons.discountTypePercentage")}</SelectItem>
                            <SelectItem value="fixed">{t("coupons.discountTypeFixed")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="newCouponDiscountValue">{t("coupons.discountValueLabel")}</Label>
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
                        <Label htmlFor="newCouponUsageLimit">{t("coupons.usageLimitLabel")}</Label>
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
                        <Label htmlFor="newCouponMinPurchase">{t("coupons.minPurchaseLabel")}</Label>
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
                        <Label htmlFor="newCouponMaxDiscount">{t("coupons.maxDiscountLabel")}</Label>
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
                        <Label>{t("coupons.startDateLabel")}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!newCouponStartDate && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newCouponStartDate ? format(newCouponStartDate, "PPP", { locale: dateFnsLocale }) : <span className="text-gray-500">{t("coupons.pickDate")}</span>}
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
                        <Label>{t("coupons.endDateLabel")}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!newCouponEndDate && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newCouponEndDate ? format(newCouponEndDate, "PPP", { locale: dateFnsLocale }) : <span className="text-gray-500">{t("coupons.pickDate")}</span>}
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
                          {t("coupons.submitCreating")}
                        </>
                      ) : (
                        t("coupons.submitCreate")
                      )}
                    </Button>
                  </form>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("coupons.listTitle")}</h3>
                  {myCoupons.length === 0 ? (
                    <p className="text-gray-500">{t("coupons.listEmpty")}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("coupons.colCode")}</TableHead>
                          <TableHead>{t("coupons.colName")}</TableHead>
                          <TableHead>{t("coupons.colDiscount")}</TableHead>
                          <TableHead>{t("coupons.colUses")}</TableHead>
                          <TableHead>{t("coupons.colStatus")}</TableHead>
                          <TableHead>{t("coupons.colActions")}</TableHead>
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
                              {coupon.minPurchase && <div className="text-xs text-gray-500">{t("coupons.minShort", { amount: formatPrice(coupon.minPurchase) })}</div>}
                              {coupon.maxDiscount && <div className="text-xs text-gray-500">{t("coupons.maxShort", { amount: formatPrice(coupon.maxDiscount) })}</div>}
                            </TableCell>
                            <TableCell>
                              <div>{t("coupons.usesCount", { count: coupon.usedCount || 0 })}</div>
                              {coupon.usageLimit && <div className="text-xs text-gray-500">{t("coupons.usesOfLimit", { limit: coupon.usageLimit })}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={coupon.isActive ? "default" : "secondary"}>
                                {coupon.isActive ? t("coupons.statusActive") : t("coupons.statusInactive")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleMyCouponActive(coupon.id, coupon.isActive)}
                                >
                                  {coupon.isActive ? t("coupons.deactivate") : t("coupons.activate")}
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

          {activeTab === "resellerProgram" && currentUser?.firebaseUser?.uid && (
            <SellerResellerProgramPanel
              sellerId={currentUser.firebaseUser.uid}
              products={myProducts.map((p) => ({
                id: p.id,
                name: p.name,
                allowResellerShare: p.allowResellerShare,
                isService: p.isService,
              }))}
            />
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
                <CardTitle>{t("shipping.title")}</CardTitle>
                <CardDescription>{t("shipping.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tabla responsive con scroll horizontal */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">{t("shipping.colProduct")}</TableHead>
                        <TableHead className="min-w-[80px] text-center">{t("shipping.colQty")}</TableHead>
                        <TableHead className="min-w-[140px]">{t("shipping.colBuyer")}</TableHead>
                        <TableHead className="min-w-[140px]">{t("shipping.colAddress")}</TableHead>
                        <TableHead className="min-w-[100px] text-sm">{t("shipping.colDate")}</TableHead>
                        <TableHead className="min-w-[140px]">{t("shipping.colStatus")}</TableHead>
                        <TableHead className="min-w-[120px]">{t("shipping.colAction")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((venta) => {
                        console.log('Venta en tabla:', venta)
                        return (
                          <TableRow key={venta.compraId + '-' + venta.productId}>
                          <TableCell className="max-w-[150px]">
                            <div className="truncate font-medium" title={venta.productName}>
                              {venta.productName || t("shipping.productUntitled")}
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
                                return date.toLocaleDateString(dateLocale);
                              }
                              // Si es un string ISO
                              if (typeof venta.fechaCompra === 'string') {
                                const date = new Date(venta.fechaCompra);
                                if (!isNaN(date.getTime())) return date.toLocaleDateString(dateLocale);
                              }
                              // Si es un número (timestamp en ms)
                              if (typeof venta.fechaCompra === 'number') {
                                const date = new Date(venta.fechaCompra);
                                if (!isNaN(date.getTime())) return date.toLocaleDateString(dateLocale);
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
                                <SelectItem value="pendiente">{t("shipping.legacy.pendiente")}</SelectItem>
                                <SelectItem value="preparacion">{t("shipping.legacy.preparacion")}</SelectItem>
                                <SelectItem value="enviado">{t("shipping.legacy.enviado")}</SelectItem>
                                <SelectItem value="entregado">{t("shipping.legacy.entregado")}</SelectItem>
                                <SelectItem value="cancelado">{t("shipping.legacy.cancelado")}</SelectItem>
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
                              {t("shipping.save")}
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
                    {t("shipping.empty")}
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



