"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Home,
  Users,
  Tag,
  List,
  Package2,
  ShoppingBag,
  Trash2,
  ImageIcon,
  XCircle,
  ShoppingCart,
  User,
  PlusCircle,
  Star,
  Megaphone,
  AlertTriangle,
  Percent,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  DollarSign,
  CreditCard,
  TrendingUp,
  Filter,
  Download,
  CheckCircle,
  Clock,
  X,
  Search,
  Bike,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

import { useState, useEffect, type ChangeEvent, useMemo, useRef } from "react"
import { db, storage } from "@/lib/firebase"
import {
  collection,
  addDoc, // Keep if adding categories/brands
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  where,
  getDoc,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { deleteStoragePathAsAdmin } from "@/lib/admin-storage-client"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/contexts/auth-context"
import type { 
  AdminSaleRecord, 
  AdminSalesSummary, 
  SalesFilters, 
  SalesSorting,
  CentralizedPurchase,
  PurchaseItem,
  SellerBankConfig,
  COMMISSION_RATE 
} from "@/types/centralized-payments"
import { 
  calculateCommissionReport, 
  calculateCommissionDistribution, 
  generateCommissionInvoice, 
  processCommissionPayments,
  getAdminSalesData,
  updatePurchasePaymentStatus,
  type CommissionDistribution
} from "@/lib/centralized-payments-api"
import * as XLSX from "xlsx"
import { useToast } from "@/components/ui/use-toast"
import { getDashboardProductImage } from "@/lib/image-utils"
import { formatPrice, formatPriceNumber } from "@/lib/utils"
import { getDateFnsLocale } from "@/lib/i18n/date-locale"
import { getCadeteStatusLabel } from "@/lib/i18n/cadete-labels"
import { getPurchaseStatusLabel, getShippingStatusLabel } from "@/lib/i18n/shipping-status-label"
import SubscriptionPricingManager from "@/components/admin/subscription-pricing-manager"
import type { CadeteStatus } from "@/types/cadete"
import { sendCadeteStatusEmail } from "@/lib/email-service"

interface UserData {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: Date
  role?: string
  photoURL?: string
  phone?: string
  zone?: string
  vehicle?: string
  documentId?: string
  status?: string
  subscription_status?: "active" | "inactive" | "cancelled"
  isSubscribed?: boolean
  productUploadLimit?: number
}

interface Category {
  id: string
  name: string
  description?: string
  imageUrl?: string
  imagePath?: string
}

interface Brand {
  id: string
  name: string
  imageUrl?: string
  imagePath?: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  brand?: string
  imageUrl?: string
  media?: any[]
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  imagePath?: string
  seller?: UserData
  averageRating?: number // Added for reviews filter
}

interface Banner {
  id: string
  title: string
  description?: string
  imageUrl: string
  imagePath: string
  linkUrl?: string
  isActive: boolean
  order: number
  createdAt: any
  updatedAt?: any
}

interface OfferAlert {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  isActive: boolean
  startDate: any
  endDate?: any
  createdAt: any
  updatedAt?: any
}

interface Coupon {
  id: string
  code: string
  name: string
  description?: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase?: number
  maxDiscount?: number
  usageLimit?: number
  usedCount: number
  isActive: boolean
  startDate: any
  endDate?: any
  applicableTo: "all" | "sellers" | "buyers"
  createdAt: any
  updatedAt?: any
}

// Tipos para los datos enriquecidos
interface Purchase {
  id: string
  buyerId: string
  createdAt: any
  paymentId: string
  productIds: string[]
  status: string
  totalAmount: number
  type: string
  vendedorIds: string[]
  products: any[] // <-- Añadido para reflejar el modelo real de Firestore
  paidToSellers?: boolean // <-- NUEVO CAMPO OPCIONAL
}
interface UserMap { [key: string]: any }
interface ProductMap { [key: string]: any }

// 1. Definir el tipo para la venta por producto
interface VentaProductoAdmin {
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
  pagado: boolean; // <-- nuevo campo
}

export default function AdminDashboard() {
  const t = useTranslations("adminDashboard")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const fmtNum = (n: number) => formatPriceNumber(n, locale)
  const fmtCur = (n: number) => formatPrice(n, locale)
  const dateFnsLocale = getDateFnsLocale(locale)
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const adminNavItems = useMemo(
    () =>
      [
        { tab: "overview", label: t("nav.overview"), icon: Home },
        { tab: "users", label: t("nav.users"), icon: Users },
        { tab: "cadetes", label: t("nav.cadetes"), icon: Bike },
        { tab: "categories", label: t("nav.categories"), icon: List },
        { tab: "brands", label: t("nav.brands"), icon: Tag },
        { tab: "allProducts", label: t("nav.allProducts"), icon: ShoppingCart },
        { tab: "sales", label: t("nav.sales"), icon: DollarSign },
        { tab: "banners", label: t("nav.banners"), icon: ImageIcon },
        { tab: "alerts", label: t("nav.alerts"), icon: Megaphone },
        { tab: "coupons", label: t("nav.coupons"), icon: Percent },
        { tab: "subscriptionPricing", label: t("nav.subscriptionPricing"), icon: Percent },
      ] as const,
    [t]
  )

  const [activeTab, setActiveTab] = useState("overview")
  const [users, setUsers] = useState<UserData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Product[]>([]) // Still used for overview count
  const [allProducts, setAllProducts] = useState<Product[]>([])

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(null)
  const [newCategoryImagePreviewUrl, setNewCategoryImagePreviewUrl] = useState<string | null>(null)
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false)
  
  // Category Edit State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [editCategoryDescription, setEditCategoryDescription] = useState("")
  const [editCategoryImageFile, setEditCategoryImageFile] = useState<File | null>(null)
  const [editCategoryImagePreviewUrl, setEditCategoryImagePreviewUrl] = useState<string | null>(null)
  const [uploadingEditCategoryImage, setUploadingEditCategoryImage] = useState(false)

  // Brand Form State
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImageFile, setNewBrandImageFile] = useState<File | null>(null)
  const [newBrandImagePreviewUrl, setNewBrandImagePreviewUrl] = useState<string | null>(null)
  const [uploadingBrandImage, setUploadingBrandImage] = useState(false)
  
  // Brand Edit State
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [editBrandName, setEditBrandName] = useState("")
  const [editBrandImageFile, setEditBrandImageFile] = useState<File | null>(null)
  const [editBrandImagePreviewUrl, setEditBrandImagePreviewUrl] = useState<string | null>(null)
  const [uploadingEditBrandImage, setUploadingEditBrandImage] = useState(false)

  const [loading, setLoading] = useState(true)
  const [addingCategory, setAddingCategory] = useState(false)
  const [addingBrand, setAddingBrand] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para los filtros de todos los productos
  const [allProductsSearchTerm, setAllProductsSearchTerm] = useState("")
  const [allProductsFilterCategory, setAllProductsFilterCategory] = useState("all")
  const [allProductsFilterSeller, setAllProductsFilterSeller] = useState("all")
  const [allProductsFilterIsService, setAllProductsFilterIsService] = useState("all")
  const [allProductsSortOrder, setAllProductsSortOrder] = useState("default") // New state for sorting
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  // Estados para banners
  const [banners, setBanners] = useState<Banner[]>([])
  const [newBannerTitle, setNewBannerTitle] = useState("")
  const [newBannerDescription, setNewBannerDescription] = useState("")
  const [newBannerImageFile, setNewBannerImageFile] = useState<File | null>(null)
  const [newBannerImagePreviewUrl, setNewBannerImagePreviewUrl] = useState<string | null>(null)
  const [newBannerLinkUrl, setNewBannerLinkUrl] = useState("")
  const [newBannerOrder, setNewBannerOrder] = useState(1)
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false)
  const [addingBanner, setAddingBanner] = useState(false)

  // Estados para alertas de ofertas
  const [offerAlerts, setOfferAlerts] = useState<OfferAlert[]>([])
  const [newAlertTitle, setNewAlertTitle] = useState("")
  const [newAlertMessage, setNewAlertMessage] = useState("")
  const [newAlertType, setNewAlertType] = useState<"info" | "warning" | "success" | "error">("info")
  const [newAlertStartDate, setNewAlertStartDate] = useState("")
  const [newAlertEndDate, setNewAlertEndDate] = useState("")
  const [addingAlert, setAddingAlert] = useState(false)

  // Estados para cupones
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [newCouponCode, setNewCouponCode] = useState("")
  const [newCouponName, setNewCouponName] = useState("")
  const [newCouponDescription, setNewCouponDescription] = useState("")
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [newCouponDiscountValue, setNewCouponDiscountValue] = useState("")
  const [newCouponMinPurchase, setNewCouponMinPurchase] = useState("")
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState("")
  const [newCouponUsageLimit, setNewCouponUsageLimit] = useState("")
  const [newCouponApplicableTo, setNewCouponApplicableTo] = useState<"all" | "sellers" | "buyers">("all")
  const [newCouponStartDate, setNewCouponStartDate] = useState("")
  const [newCouponEndDate, setNewCouponEndDate] = useState("")
  const [addingCoupon, setAddingCoupon] = useState(false)

  // Estados para la pestaña de Ventas
  const [salesData, setSalesData] = useState<VentaProductoAdmin[]>([])
  const [salesSummary, setSalesSummary] = useState({
    totalVentas: 0,
    totalComisiones: 0,
    totalPendientePago: 0,
    totalPagado: 0,
    ventasPorVendedor: [] as {
      vendedorId: string;
      vendedorNombre: string;
      totalVentas: number;
      totalComisiones: number;
    }[]
  })
  const [salesFilters, setSalesFilters] = useState<SalesFilters>({
    estadoPago: 'all',
    estadoEnvio: 'all'
  })
  const [salesSorting, setSalesSorting] = useState<SalesSorting>({
    field: 'fecha',
    order: 'desc'
  })
  const [loadingSales, setLoadingSales] = useState(false)
  const [markingPayment, setMarkingPayment] = useState<string | null>(null)
  const [updatingShipping, setUpdatingShipping] = useState<string | null>(null)
  
  // Estados para modal de marcado manual de pagos
  const [paymentMarkingModal, setPaymentMarkingModal] = useState<{
    isOpen: boolean
    compraId: string
    vendedorId: string
    vendedorNombre: string
    monto: number
  }>({
    isOpen: false,
    compraId: '',
    vendedorId: '',
    vendedorNombre: '',
    monto: 0
  })
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mercadopago' | 'cash'>('bank_transfer')
  
  // Estados para historial de pagos manuales
  const [manualPayments, setManualPayments] = useState<any[]>([])
  const [loadingManualPayments, setLoadingManualPayments] = useState(false)
  
  // Estados para notificaciones
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  
  // Estados para acciones masivas
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedSales, setSelectedSales] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Estados para reportes de comisiones
  const [commissionReport, setCommissionReport] = useState<any>(null)
  const [commissionDistribution, setCommissionDistribution] = useState<CommissionDistribution[]>([])
  const [loadingCommissions, setLoadingCommissions] = useState(false)
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [viewByPurchase, setViewByPurchase] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [usersMap, setUsersMap] = useState<UserMap>({})
  const [productsMap, setProductsMap] = useState<ProductMap>({})
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [filters, setFilters] = useState({
    estado: 'all',
    vendedor: '',
    comprador: '',
    producto: '',
    compra: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Justo después de los useState
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [bankData, setBankData] = useState<any | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoadingAdmin(true)
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
      // Fetch purchases
      const purchasesSnap = await getDocs(collection(db, 'purchases'))
      const purchases: Purchase[] = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Purchase)
      console.log('PURCHASES:', purchases)
      setPurchases(purchases)
      setLoadingAdmin(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!currentUser) {
      router.push("/login")
      return
    }

    if (currentUser?.role !== "admin") {
      router.push(currentUser?.role === "seller" ? "/dashboard/seller" : "/?error=unauthorized_admin")
      return
    }

    fetchAdminData()
  }, [currentUser, authLoading, router])

  useEffect(() => {
    if (activeTab === "sales" && currentUser) {
      fetchSalesData()
    }
    if (activeTab === "manual-payments" && currentUser) {
      fetchManualPayments()
    }
    if (activeTab === "notifications" && currentUser) {
      fetchNotifications()
    }
    if (activeTab === "commissions" && currentUser) {
      fetchCommissionReport()
    }
  }, [activeTab, currentUser])

  // Debounce para la búsqueda
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchTerm])

  // Filtrado en tiempo real de compras
  useEffect(() => {
    const filtered = purchases.filter(compra => {
      // Filtro por estado de pago
      if (salesFilters.estadoPago && salesFilters.estadoPago !== 'all') {
        if (salesFilters.estadoPago === 'pendiente' && compra.status !== 'pending') return false
        if (salesFilters.estadoPago === 'pagado' && compra.status !== 'approved') return false
        if (salesFilters.estadoPago === 'cancelado' && compra.status !== 'cancelled') return false
      }
      
      // Filtro por estado de envío
      if (salesFilters.estadoEnvio && salesFilters.estadoEnvio !== 'all') {
        if (compra.status !== salesFilters.estadoEnvio) return false
      }
      
      // Filtro por vendedor
      if (salesFilters.vendedorId && salesFilters.vendedorId !== 'all') {
        const hasVendedor = Array.isArray(compra.products) && compra.products.some((p: any) => p.vendedorId === salesFilters.vendedorId)
        if (!hasVendedor) return false
      }
      
      // Filtro por búsqueda
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase()
        
        // Buscar por ID de compra
        if (compra.id.toLowerCase().includes(searchLower)) return true
        
        // Buscar por comprador
        const buyerName = usersMap[compra.buyerId as string]?.name || ''
        if (buyerName.toLowerCase().includes(searchLower)) return true
        
        // Buscar por productos
        if (Array.isArray(compra.products)) {
          const hasMatchingProduct = compra.products.some((p: any) => {
            const productName = p.nombre || p.productName || p.productoNombre || ''
            return productName.toLowerCase().includes(searchLower)
          })
          if (hasMatchingProduct) return true
        }
        
        return false
      }
      
      return true
    })
    
    setFilteredPurchases(filtered)
  }, [purchases, salesFilters, debouncedSearchTerm, usersMap])

  const fetchAdminData = async () => {
    setLoading(true)
    setError(null)
    try {
      const usersCollection = collection(db, "users")
      const userSnapshot = await getDocs(usersCollection)
      const usersData = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as UserData[]
      setUsers(usersData)

      const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
      const categorySnapshot = await getDocs(categoriesQuery)
      setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category))

      const brandsQuery = query(collection(db, "brands"), orderBy("name"))
      const brandSnapshot = await getDocs(brandsQuery)
      setBrands(brandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Brand))

      const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"))
      const productSnapshot = await getDocs(productsQuery)
      const productsData = productSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            averageRating: Number.parseFloat((Math.random() * 5).toFixed(1)), // Simulate average rating
          }) as Product,
      )
      setProducts(productsData) // Update products state for overview count

      // Obtener todos los productos con información del vendedor
      const allProductsWithSellers = await Promise.all(
        productsData.map(async (product) => {
          const seller = usersData.find((user) => user.id === product.sellerId)
          return {
            ...product,
            seller,
          }
        }),
      )
      setAllProducts(allProductsWithSellers)

      // Cargar banners
      const bannersQuery = query(collection(db, "banners"), orderBy("order"))
      const bannerSnapshot = await getDocs(bannersQuery)
      setBanners(bannerSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Banner))

      // Cargar alertas de ofertas
      const alertsQuery = query(collection(db, "offerAlerts"), orderBy("createdAt", "desc"))
      const alertSnapshot = await getDocs(alertsQuery)
      setOfferAlerts(alertSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OfferAlert))

      // Cargar cupones
      const couponsQuery = query(collection(db, "coupons"), orderBy("createdAt", "desc"))
      const couponSnapshot = await getDocs(couponsQuery)
      setCoupons(couponSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Coupon))

      // Cargar datos de ventas si está en la pestaña de ventas
      if (activeTab === "sales") {
        await fetchSalesData()
      }
    } catch (err) {
      console.error("Error fetching admin data:", err)
      setError(t("errors.loadPanel"))
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesData = async () => {
    setLoadingSales(true)
    try {
      // Obtener todas las compras
      const purchasesSnap = await getDocs(collection(db, 'purchases'))
      const purchases = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Purchase[]
      // Desglosar productos de cada compra
      const usersMap: { [key: string]: any } = users.reduce((acc, u) => { acc[u.id] = u; return acc }, {} as { [key: string]: any })
      const productsMap: { [key: string]: any } = products.reduce((acc, p) => { acc[p.id] = p; return acc }, {} as { [key: string]: any })
      const ventasPorProducto: VentaProductoAdmin[] = purchases.flatMap(compra => {
        if (!Array.isArray(compra.products)) return []
        return compra.products.map((prod: any) => ({
          compraId: compra.id || '',
          paymentId: compra.paymentId || '',
          status: compra.status || '',
          totalAmount: compra.totalAmount || 0,
          fechaCompra: compra.createdAt?.toDate?.() ? compra.createdAt.toDate().toISOString() : (typeof compra.createdAt === 'string' ? compra.createdAt : ''),
          buyerId: compra.buyerId || '',
          compradorNombre: usersMap?.[compra.buyerId]?.name || '',
          compradorEmail: usersMap?.[compra.buyerId]?.email || '',
          productId: prod?.productId || '',
          productName: prod?.nombre || productsMap?.[prod?.productId]?.name || '',
          productPrice: prod?.precio || productsMap?.[prod?.productId]?.price || 0,
          quantity: prod?.quantity || 0,
          vendedorId: prod?.vendedorId || '',
          vendedorNombre: usersMap?.[prod?.vendedorId]?.name || '',
          vendedorEmail: usersMap?.[prod?.vendedorId]?.email || '',
          pagado: typeof prod?.pagado === 'boolean' ? prod.pagado : false,
        }))
      })
      setSalesData(ventasPorProducto)
      setPurchases(purchases)

      // Calcular métricas de ventas
      const COMMISSION_RATE = 0.08;
      const approvedPurchases = purchases.filter(p => p.status === 'approved');
      const totalVentas = approvedPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalComisiones = totalVentas * COMMISSION_RATE;
      let totalPagado = 0;
      let totalPendiente = 0;
      approvedPurchases.forEach(p => {
        if (Array.isArray(p.products)) {
          p.products.forEach(prod => {
            const monto = (prod.precio || prod.price || 0) * (prod.quantity || 1);
            if (prod.pagado) {
              totalPagado += monto * (1 - COMMISSION_RATE);
            } else {
              totalPendiente += monto * (1 - COMMISSION_RATE);
            }
          });
        }
      });
      if (totalPagado === 0 && totalPendiente === 0) {
        totalPendiente = totalVentas - totalComisiones;
      }

      // Calcular ventas por vendedor
      const ventasPorVendedorMap: { [vendedorId: string]: { vendedorNombre: string, totalVentas: number, totalComisiones: number } } = {};
      ventasPorProducto.forEach(vp => {
        if (!vp.vendedorId) return;
        if (!ventasPorVendedorMap[vp.vendedorId]) {
          ventasPorVendedorMap[vp.vendedorId] = {
            vendedorNombre: vp.vendedorNombre || 'Desconocido',
            totalVentas: 0,
            totalComisiones: 0,
          };
        }
        ventasPorVendedorMap[vp.vendedorId].totalVentas += vp.productPrice * vp.quantity;
        ventasPorVendedorMap[vp.vendedorId].totalComisiones += vp.productPrice * vp.quantity * COMMISSION_RATE;
      });
      
      const ventasPorVendedor = Object.entries(ventasPorVendedorMap).map(([vendedorId, data]) => ({
        vendedorId,
        vendedorNombre: data.vendedorNombre,
        totalVentas: data.totalVentas,
        totalComisiones: data.totalComisiones,
      }));

      setSalesSummary({
        totalVentas,
        totalComisiones,
        totalPendientePago: totalPendiente,
        totalPagado,
        ventasPorVendedor
      });
    } catch (err) {
      console.error('Error fetching sales data:', err)
      setError(t("errors.loadSales"))
    } finally {
      setLoadingSales(false)
    }
  }

  // Función para abrir el modal de marcado de pago
  const openPaymentMarkingModal = (sale: VentaProductoAdmin) => {
    setPaymentMarkingModal({
      isOpen: true,
      compraId: sale.compraId,
      vendedorId: sale.vendedorId,
      vendedorNombre: sale.vendedorNombre,
      monto: sale.totalAmount
    })
    setPaymentNotes('')
    setPaymentMethod('bank_transfer')
  }

  // Función para cerrar el modal de marcado de pago
  const closePaymentMarkingModal = () => {
    setPaymentMarkingModal({
      isOpen: false,
      compraId: '',
      vendedorId: '',
      vendedorNombre: '',
      monto: 0
    })
    setPaymentNotes('')
  }

  // Función mejorada para marcar pago como pagado
  const handleMarkPaymentAsPaid = async () => {
    if (!currentUser || !paymentMarkingModal.isOpen) return
    
    const { compraId, vendedorId } = paymentMarkingModal
    setMarkingPayment(`${compraId}-${vendedorId}`)
    
    try {
      // Usar la función de la API centralizada
      await updatePurchasePaymentStatus(
        compraId,
        vendedorId,
        'pagado',
        currentUser.firebaseUser.uid
      )

      // Crear registro de pago manual en Firebase
      const paymentRecord = {
        compraId,
        vendedorId,
        vendedorNombre: paymentMarkingModal.vendedorNombre,
        monto: paymentMarkingModal.monto,
        metodoPago: paymentMethod,
        notas: paymentNotes.trim() || t("notifications.manualPaymentNote"),
        administradorId: currentUser.firebaseUser.uid,
        administradorNombre: currentUser.firebaseUser.displayName || t("notifications.adminFallback"),
        fechaPago: new Date().toISOString(),
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, "manualPayments"), paymentRecord)

      // Crear notificación para el vendedor
      const notificationData = {
        userId: vendedorId,
        type: "payment_completed",
        title: t("toasts.paymentProcessedTitle"),
        description: t("toasts.paymentProcessedDescription", {
          amount: fmtNum(paymentMarkingModal.monto),
          method:
            paymentMethod === "bank_transfer"
              ? t("notifications.paymentMethodBank")
              : paymentMethod === "mercadopago"
                ? t("notifications.paymentMethodMercadoPago")
                : t("notifications.paymentMethodCash"),
        }),
        compraId,
        monto: paymentMarkingModal.monto,
        metodoPago: paymentMethod,
        isRead: false,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, "notifications"), notificationData)

      // Actualizar datos locales
      await fetchSalesData()
      await fetchManualPayments()
      
      setError(null)
      closePaymentMarkingModal()
      
    } catch (err) {
      console.error("Error marking payment as paid:", err)
      setError(t("errors.markPaymentPaid"))
    } finally {
      setMarkingPayment(null)
    }
  }

  const fetchCommissionReport = async () => {
    setLoadingCommissions(true)
    try {
      const startDate = new Date(reportStartDate)
      const endDate = new Date(reportEndDate)
      
      const report = await calculateCommissionReport(startDate, endDate)
      setCommissionReport(report)
      
      const distribution = await calculateCommissionDistribution()
      setCommissionDistribution(distribution)
      
    } catch (err) {
      console.error("Error fetching commission report:", err)
      setError(t("errors.loadCommissionReport"))
    } finally {
      setLoadingCommissions(false)
    }
  }

  // Función para cargar historial de pagos manuales
  const fetchManualPayments = async () => {
    setLoadingManualPayments(true)
    try {
      const q = query(
        collection(db, "manualPayments"),
        orderBy("fechaPago", "desc")
      )
      const querySnapshot = await getDocs(q)
      const payments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setManualPayments(payments)
    } catch (err) {
      console.error("Error fetching manual payments:", err)
      setError(t("errors.loadManualPayments"))
    } finally {
      setLoadingManualPayments(false)
    }
  }

  // Función para cargar notificaciones del sistema
  const fetchNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const q = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setNotifications(notificationsData)
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError(t("errors.loadNotifications"))
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleProcessPayment = async (vendedorId: string, paymentMethod: 'bank_transfer' | 'mercadopago' | 'cash') => {
    if (!currentUser) return
    
    setMarkingPayment(vendedorId)
    try {
      const result = await processCommissionPayments(vendedorId, currentUser.firebaseUser.uid, paymentMethod)
      
      if (result.success) {
        setError(null)
        // Actualizar datos
        await fetchSalesData()
        await fetchCommissionReport()
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error("Error processing payment:", err)
      setError(t("errors.processPayment"))
    } finally {
      setMarkingPayment(null)
    }
  }

  // Función para actualizar el estado de envío
  const handleUpdateShippingStatus = async (compraId: string, newStatus: 'pendiente' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado') => {
    if (!currentUser) return
    
    setUpdatingShipping(compraId)
    try {
      // Actualizar en Firebase
      const purchaseRef = doc(db, 'centralizedPurchases', compraId)
      await updateDoc(purchaseRef, {
        estadoEnvio: newStatus,
        updatedAt: serverTimestamp()
      })

      // Crear notificación para el comprador
      const sale = salesData.find(s => s.compraId === compraId)
      if (sale) {
        const notificationData = {
          userId: sale.compradorEmail,
          type: "shipping_update",
          title: t("toasts.shippingUpdateTitle"),
          description: t("toasts.shippingUpdateDescription", {
            status: getShippingStatusLabel(t, newStatus),
          }),
          compraId,
          estadoEnvio: newStatus,
          isRead: false,
          createdAt: serverTimestamp()
        }

        await addDoc(collection(db, "notifications"), notificationData)
      }

      // Actualizar datos locales
      await fetchSalesData()
      setError(null)
      
    } catch (err) {
      console.error("Error updating shipping status:", err)
      setError(t("errors.updateShipping"))
    } finally {
      setUpdatingShipping(null)
    }
  }

  const uploadImageToStorage = async (
    file: File,
    pathPrefix: string,
  ): Promise<{ downloadURL: string; filePath: string }> => {
    if (!currentUser) throw new Error(t("errors.notAuthenticated"))
    const filePath = `${pathPrefix}/${Date.now()}-${file.name}`
    const storageRef = ref(storage, filePath)
    try {
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      return { downloadURL, filePath }
    } catch (error) {
      console.error("Error uploading image: ", error)
      throw new Error(t("errors.uploadImage"))
    }
  }

  const handleNewCategoryImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewCategoryImageFile(file)
      setNewCategoryImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveCategoryImage = () => {
    setNewCategoryImageFile(null)
    setNewCategoryImagePreviewUrl(null)
  }

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === "") {
      setError(t("errors.categoryNameEmpty"))
      return
    }
    setAddingCategory(true)
    setUploadingCategoryImage(true)
    setError(null)
    let imageUrl: string | undefined
    let imagePath: string | undefined

    try {
      if (newCategoryImageFile) {
        const { downloadURL, filePath } = await uploadImageToStorage(newCategoryImageFile, "categories")
        imageUrl = downloadURL
        imagePath = filePath
      }

      const categoryData: any = {
        name: newCategoryName,
        createdAt: serverTimestamp(),
      }
      if (newCategoryDescription.trim() !== "") {
        categoryData.description = newCategoryDescription
      }
      if (imageUrl) {
        categoryData.imageUrl = imageUrl
        categoryData.imagePath = imagePath
      }

      const docRef = await addDoc(collection(db, "categories"), categoryData)
      setCategories((prevCategories) => [
        ...prevCategories,
        { id: docRef.id, ...categoryData, createdAt: new Date() } as Category,
      ])
      setNewCategoryName("")
      setNewCategoryDescription("")
      handleRemoveCategoryImage()
    } catch (err) {
      console.error("Error adding category:", err)
      setError(t("errors.addCategory"))
    } finally {
      setAddingCategory(false)
      setUploadingCategoryImage(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string, imagePath?: string) => {
    if (!window.confirm(t("confirms.deleteCategory", { name: categoryName }))) {
      return
    }
    try {
      if (imagePath) {
        try {
          await deleteStoragePathAsAdmin(imagePath)
          console.log("Image deleted from storage:", imagePath)
        } catch (storageErr) {
          console.warn("Storage delete failed, removing category anyway:", storageErr)
        }
      }

      await deleteDoc(doc(db, "categories", categoryId))
      setCategories((prevCategories) => prevCategories.filter((cat) => cat.id !== categoryId))
      setError(null)
      console.log("Category deleted:", categoryId)
    } catch (err) {
      console.error("Error deleting category:", err)
      setError(t("errors.deleteCategory", { name: categoryName }))
    }
  }

  const handleNewBrandImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewBrandImageFile(file)
      setNewBrandImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveBrandImage = () => {
    setNewBrandImageFile(null)
    setNewBrandImagePreviewUrl(null)
  }

  const handleAddBrand = async () => {
    if (newBrandName.trim() === "") {
      setError(t("errors.brandNameEmpty"))
      return
    }
    setAddingBrand(true)
    setUploadingBrandImage(true)
    setError(null)
    let imageUrl: string | undefined
    let imagePath: string | undefined

    try {
      if (newBrandImageFile) {
        const { downloadURL, filePath } = await uploadImageToStorage(newBrandImageFile, "brands")
        imageUrl = downloadURL
        imagePath = filePath
      }

      const brandData: any = {
        name: newBrandName,
        createdAt: serverTimestamp(),
      }
      if (imageUrl) {
        brandData.imageUrl = imageUrl
        brandData.imagePath = imagePath
      }

      const docRef = await addDoc(collection(db, "brands"), brandData)
      setBrands((prevBrands) => [...prevBrands, { id: docRef.id, ...brandData, createdAt: new Date() } as Brand])
      setNewBrandName("")
      handleRemoveBrandImage()
    } catch (err) {
      console.error("Error adding brand:", err)
      setError(t("errors.addBrand"))
    } finally {
      setAddingBrand(false)
      setUploadingBrandImage(false)
    }
  }

  const handleDeleteBrand = async (brandId: string, brandName: string, imagePath?: string) => {
    if (!window.confirm(t("confirms.deleteBrand", { name: brandName }))) {
      return
    }
    try {
      if (imagePath) {
        await deleteStoragePathAsAdmin(imagePath)
        console.log("Image deleted from storage:", imagePath)
      }

      await deleteDoc(doc(db, "brands", brandId))
      setBrands((prevBrands) => prevBrands.filter((brand) => brand.id !== brandId))
      setError(null)
      console.log("Brand deleted:", brandId)
    } catch (err) {
      console.error("Error deleting brand:", err)
      setError(t("errors.deleteBrand", { name: brandName }))
    }
  }

  // Category Edit Functions
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
    setEditCategoryDescription(category.description || "")
    setEditCategoryImagePreviewUrl(category.imageUrl || null)
    setEditCategoryImageFile(null)
  }

  const handleEditCategoryImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditCategoryImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditCategoryImagePreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveEditCategoryImage = () => {
    setEditCategoryImageFile(null)
    setEditCategoryImagePreviewUrl(null)
  }

  const handleSaveCategoryEdit = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.categoryNameRequired"),
        variant: "destructive",
      })
      return
    }

    try {
      setUploadingEditCategoryImage(true)
      let imageUrl = editingCategory.imageUrl
      let imagePath = editingCategory.imagePath

      // Upload new image if selected
      if (editCategoryImageFile) {
        // Delete old image if it exists
        if (editingCategory.imagePath) {
          try {
            await deleteStoragePathAsAdmin(editingCategory.imagePath)
          } catch (error) {
            console.error("Error deleting old category image:", error)
          }
        }

        // Upload new image
        const { downloadURL, filePath } = await uploadImageToStorage(
          editCategoryImageFile,
          "categories"
        )
        imageUrl = downloadURL
        imagePath = filePath
      }

      // Update category in Firestore
      const categoryRef = doc(db, "categories", editingCategory.id)
      await updateDoc(categoryRef, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || null,
        imageUrl: imageUrl || null,
        imagePath: imagePath || null,
        updatedAt: serverTimestamp(),
      })

      toast({
        title: t("toasts.categoryUpdatedTitle"),
        description: t("toasts.categoryUpdatedDescription", { name: editCategoryName }),
      })

      // Reset edit state
      setEditingCategory(null)
      setEditCategoryName("")
      setEditCategoryDescription("")
      setEditCategoryImageFile(null)
      setEditCategoryImagePreviewUrl(null)
      setUploadingEditCategoryImage(false)

      fetchAdminData()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.updateCategoryFailed"),
        variant: "destructive",
      })
      setUploadingEditCategoryImage(false)
    }
  }

  const handleCancelCategoryEdit = () => {
    setEditingCategory(null)
    setEditCategoryName("")
    setEditCategoryDescription("")
    setEditCategoryImageFile(null)
    setEditCategoryImagePreviewUrl(null)
    setUploadingEditCategoryImage(false)
  }

  // Brand Edit Functions
  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand)
    setEditBrandName(brand.name)
    setEditBrandImagePreviewUrl(brand.imageUrl || null)
    setEditBrandImageFile(null)
  }

  const handleEditBrandImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditBrandImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditBrandImagePreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveEditBrandImage = () => {
    setEditBrandImageFile(null)
    setEditBrandImagePreviewUrl(null)
  }

  const handleSaveBrandEdit = async () => {
    if (!editingBrand || !editBrandName.trim()) {
      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.brandNameRequired"),
        variant: "destructive",
      })
      return
    }

    try {
      setUploadingEditBrandImage(true)
      let imageUrl = editingBrand.imageUrl
      let imagePath = editingBrand.imagePath

      // Upload new image if selected
      if (editBrandImageFile) {
        // Delete old image if it exists
        if (editingBrand.imagePath) {
          try {
            await deleteStoragePathAsAdmin(editingBrand.imagePath)
          } catch (error) {
            console.error("Error deleting old brand image:", error)
          }
        }

        // Upload new image
        const { downloadURL, filePath } = await uploadImageToStorage(
          editBrandImageFile,
          "brands"
        )
        imageUrl = downloadURL
        imagePath = filePath
      }

      // Update brand in Firestore
      const brandRef = doc(db, "brands", editingBrand.id)
      await updateDoc(brandRef, {
        name: editBrandName.trim(),
        imageUrl: imageUrl || null,
        imagePath: imagePath || null,
        updatedAt: serverTimestamp(),
      })

      toast({
        title: t("toasts.brandUpdatedTitle"),
        description: t("toasts.brandUpdatedDescription", { name: editBrandName }),
      })

      // Reset edit state
      setEditingBrand(null)
      setEditBrandName("")
      setEditBrandImageFile(null)
      setEditBrandImagePreviewUrl(null)
      setUploadingEditBrandImage(false)

      fetchAdminData()
    } catch (error) {
      console.error("Error updating brand:", error)
      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.updateBrandFailed"),
        variant: "destructive",
      })
      setUploadingEditBrandImage(false)
    }
  }

  const handleCancelBrandEdit = () => {
    setEditingBrand(null)
    setEditBrandName("")
    setEditBrandImageFile(null)
    setEditBrandImagePreviewUrl(null)
    setUploadingEditBrandImage(false)
  }

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const user = users.find((u) => u.id === userId)
      const userRef = doc(db, "users", userId)
      const nextActive = !currentStatus
      const updates: Record<string, unknown> = { isActive: nextActive }

      if (user?.role === "cadete") {
        updates.status = nextActive ? "approved" : "rejected"
        if (nextActive) {
          updates.approvedAt = serverTimestamp()
        } else {
          updates.rejectedAt = serverTimestamp()
        }
      }

      await updateDoc(userRef, updates)
      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                isActive: nextActive,
                status: user?.role === "cadete" ? (nextActive ? "approved" : "rejected") : u.status,
              }
            : u
        )
      )
    } catch (error) {
      console.error("Error updating user status:", error)
      setError(t("errors.updateUserStatus"))
    }
  }

  const handleApproveCadete = async (userId: string) => {
    try {
      const cadete = users.find((u) => u.id === userId)
      await updateDoc(doc(db, "users", userId), {
        status: "approved",
        isActive: true,
        approvedAt: serverTimestamp(),
      })
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, status: "approved", isActive: true } : u))
      )
      if (cadete?.email) {
        void sendCadeteStatusEmail({
          user_name: cadete.name || t("cadetes.defaultName"),
          user_email: cadete.email,
          decision: "approved",
        })
      }
    } catch (error) {
      console.error("Error approving cadete:", error)
      setError(t("errors.approveCadete"))
    }
  }

  const handleRejectCadete = async (userId: string) => {
    try {
      const cadete = users.find((u) => u.id === userId)
      await updateDoc(doc(db, "users", userId), {
        status: "rejected",
        isActive: false,
        rejectedAt: serverTimestamp(),
      })
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, status: "rejected", isActive: false } : u))
      )
      if (cadete?.email) {
        void sendCadeteStatusEmail({
          user_name: cadete.name || t("cadetes.defaultName"),
          user_email: cadete.email,
          decision: "rejected",
        })
      }
    } catch (error) {
      console.error("Error rejecting cadete:", error)
      setError(t("errors.rejectCadete"))
    }
  }

  // Función para eliminar productos desde la pestaña "Todos los Productos"
  const handleDeleteAllProduct = async (productId: string, productName: string) => {
    if (!window.confirm(t("confirms.deleteProduct", { name: productName }))) {
      return
    }
    setDeletingProductId(productId)
    try {
      await deleteDoc(doc(db, "products", productId))
      setAllProducts((prevProducts) => prevProducts.filter((prod) => prod.id !== productId))
      setProducts((prevProducts) => prevProducts.filter((prod) => prod.id !== productId)) // Also update the main products list
      setError(null)
      console.log("Product deleted:", productId)
    } catch (err) {
      console.error("Error deleting product:", err)
      setError(t("errors.deleteProduct", { name: productName }))
    } finally {
      setDeletingProductId(null)
    }
  }

  // Funciones para manejar banners
  const handleNewBannerImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNewBannerImageFile(file)
      setNewBannerImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveBannerImage = () => {
    setNewBannerImageFile(null)
    setNewBannerImagePreviewUrl(null)
  }

  const handleAddBanner = async () => {
    if (newBannerTitle.trim() === "") {
      setError(t("errors.bannerTitleEmpty"))
      return
    }
    if (!newBannerImageFile) {
      setError(t("errors.bannerImageRequired"))
      return
    }

    setAddingBanner(true)
    setUploadingBannerImage(true)
    setError(null)

    try {
      const { downloadURL, filePath } = await uploadImageToStorage(newBannerImageFile, "banners")

      const bannerData: any = {
        title: newBannerTitle,
        imageUrl: downloadURL,
        imagePath: filePath,
        isActive: true,
        order: newBannerOrder,
        createdAt: serverTimestamp(),
      }

      // Solo agregar campos opcionales si tienen valor
      if (newBannerDescription.trim()) {
        bannerData.description = newBannerDescription.trim()
      }
      if (newBannerLinkUrl.trim()) {
        bannerData.linkUrl = newBannerLinkUrl.trim()
      }

      const docRef = await addDoc(collection(db, "banners"), bannerData)
      setBanners((prevBanners) => [
        ...prevBanners,
        { id: docRef.id, ...bannerData, createdAt: new Date() } as Banner,
      ])

      // Reset form
      setNewBannerTitle("")
      setNewBannerDescription("")
      setNewBannerLinkUrl("")
      setNewBannerOrder(1)
      handleRemoveBannerImage()
    } catch (err) {
      console.error("Error adding banner:", err)
      setError(t("errors.addBanner"))
    } finally {
      setAddingBanner(false)
      setUploadingBannerImage(false)
    }
  }

  const handleToggleBannerActive = async (bannerId: string, currentStatus: boolean) => {
    try {
      const bannerRef = doc(db, "banners", bannerId)
      await updateDoc(bannerRef, { isActive: !currentStatus })
      setBanners(banners.map((banner) => (banner.id === bannerId ? { ...banner, isActive: !currentStatus } : banner)))
    } catch (error) {
      console.error("Error updating banner status:", error)
      setError(t("errors.updateBanner"))
    }
  }

  const handleDeleteBanner = async (bannerId: string, bannerTitle: string, imagePath?: string) => {
    if (!window.confirm(t("confirms.deleteBanner", { name: bannerTitle }))) {
      return
    }
    try {
      if (imagePath) {
        await deleteStoragePathAsAdmin(imagePath)
      }

      await deleteDoc(doc(db, "banners", bannerId))
      setBanners((prevBanners) => prevBanners.filter((banner) => banner.id !== bannerId))
      setError(null)
    } catch (err) {
      console.error("Error deleting banner:", err)
      setError(t("errors.deleteBanner", { name: bannerTitle }))
    }
  }

  // Funciones para manejar alertas de ofertas
  const handleAddAlert = async () => {
    if (newAlertTitle.trim() === "") {
      setError(t("errors.alertTitleEmpty"))
      return
    }
    if (newAlertMessage.trim() === "") {
      setError(t("errors.alertMessageEmpty"))
      return
    }

    setAddingAlert(true)
    setError(null)

    try {
      const alertData: any = {
        title: newAlertTitle,
        message: newAlertMessage,
        type: newAlertType,
        isActive: true,
        createdAt: serverTimestamp(),
      }

      // Solo agregar campos opcionales si tienen valor
      if (newAlertStartDate) {
        alertData.startDate = new Date(newAlertStartDate)
      } else {
        alertData.startDate = serverTimestamp()
      }
      if (newAlertEndDate) {
        alertData.endDate = new Date(newAlertEndDate)
      }

      const docRef = await addDoc(collection(db, "offerAlerts"), alertData)
      setOfferAlerts((prevAlerts) => [
        { id: docRef.id, ...alertData, createdAt: new Date() } as OfferAlert,
        ...prevAlerts,
      ])

      // Reset form
      setNewAlertTitle("")
      setNewAlertMessage("")
      setNewAlertType("info")
      setNewAlertStartDate("")
      setNewAlertEndDate("")
    } catch (err) {
      console.error("Error adding alert:", err)
      setError(t("errors.addAlert"))
    } finally {
      setAddingAlert(false)
    }
  }

  const handleToggleAlertActive = async (alertId: string, currentStatus: boolean) => {
    try {
      const alertRef = doc(db, "offerAlerts", alertId)
      await updateDoc(alertRef, { isActive: !currentStatus })
      setOfferAlerts(offerAlerts.map((alert) => (alert.id === alertId ? { ...alert, isActive: !currentStatus } : alert)))
    } catch (error) {
      console.error("Error updating alert status:", error)
      setError(t("errors.updateAlert"))
    }
  }

  const handleDeleteAlert = async (alertId: string, alertTitle: string) => {
    if (!window.confirm(t("confirms.deleteAlert", { name: alertTitle }))) {
      return
    }
    try {
      await deleteDoc(doc(db, "offerAlerts", alertId))
      setOfferAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId))
      setError(null)
    } catch (err) {
      console.error("Error deleting alert:", err)
      setError(t("errors.deleteAlert", { name: alertTitle }))
    }
  }

  // Funciones para manejar cupones
  const handleAddCoupon = async () => {
    if (newCouponCode.trim() === "") {
      setError(t("errors.couponCodeEmpty"))
      return
    }
    if (newCouponName.trim() === "") {
      setError(t("errors.couponNameEmpty"))
      return
    }
    if (!newCouponDiscountValue || parseFloat(newCouponDiscountValue) <= 0) {
      setError(t("errors.couponDiscountInvalid"))
      return
    }

    setAddingCoupon(true)
    setError(null)

    try {
      const couponData: any = {
        code: newCouponCode.toUpperCase(),
        name: newCouponName,
        discountType: newCouponDiscountType,
        discountValue: parseFloat(newCouponDiscountValue),
        usedCount: 0,
        isActive: true,
        applicableTo: newCouponApplicableTo,
        createdAt: serverTimestamp(),
      }

      // Solo agregar campos opcionales si tienen valor
      if (newCouponDescription.trim()) {
        couponData.description = newCouponDescription.trim()
      }
      if (newCouponMinPurchase) {
        couponData.minPurchase = parseFloat(newCouponMinPurchase)
      }
      if (newCouponMaxDiscount) {
        couponData.maxDiscount = parseFloat(newCouponMaxDiscount)
      }
      if (newCouponUsageLimit) {
        couponData.usageLimit = parseInt(newCouponUsageLimit)
      }
      if (newCouponStartDate) {
        couponData.startDate = new Date(newCouponStartDate)
      } else {
        couponData.startDate = serverTimestamp()
      }
      if (newCouponEndDate) {
        couponData.endDate = new Date(newCouponEndDate)
      }

      const docRef = await addDoc(collection(db, "coupons"), couponData)
      setCoupons((prevCoupons) => [
        { id: docRef.id, ...couponData, createdAt: new Date() } as Coupon,
        ...prevCoupons,
      ])

      // Reset form
      setNewCouponCode("")
      setNewCouponName("")
      setNewCouponDescription("")
      setNewCouponDiscountType("percentage")
      setNewCouponDiscountValue("")
      setNewCouponMinPurchase("")
      setNewCouponMaxDiscount("")
      setNewCouponUsageLimit("")
      setNewCouponApplicableTo("all")
      setNewCouponStartDate("")
      setNewCouponEndDate("")
    } catch (err) {
      console.error("Error adding coupon:", err)
      setError(t("errors.addCoupon"))
    } finally {
      setAddingCoupon(false)
    }
  }

  const handleToggleCouponActive = async (couponId: string, currentStatus: boolean) => {
    try {
      const couponRef = doc(db, "coupons", couponId)
      await updateDoc(couponRef, { isActive: !currentStatus })
      setCoupons(coupons.map((coupon) => (coupon.id === couponId ? { ...coupon, isActive: !currentStatus } : coupon)))
    } catch (error) {
      console.error("Error updating coupon status:", error)
      setError(t("errors.updateCoupon"))
    }
  }

  const handleDeleteCoupon = async (couponId: string, couponName: string) => {
    if (!window.confirm(t("confirms.deleteCoupon", { name: couponName }))) {
      return
    }
    try {
      await deleteDoc(doc(db, "coupons", couponId))
      setCoupons((prevCoupons) => prevCoupons.filter((coupon) => coupon.id !== couponId))
      setError(null)
    } catch (err) {
      console.error("Error deleting coupon:", err)
      setError(t("errors.deleteCoupon", { name: couponName }))
    }
  }

  // Funciones para acciones masivas
  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleBulkUserAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) {
      setError(t("errors.noUsersSelected"))
      return
    }

    const confirmMessage =
      action === "activate"
        ? t("confirms.bulkActivateUsers", { count: selectedUsers.length })
        : action === "deactivate"
          ? t("confirms.bulkDeactivateUsers", { count: selectedUsers.length })
          : t("confirms.bulkDeleteUsers", { count: selectedUsers.length })

    if (!window.confirm(confirmMessage)) return

    setBulkActionLoading(true)
    try {
      for (const userId of selectedUsers) {
        if (action === 'delete') {
          await deleteDoc(doc(db, "users", userId))
        } else {
          const user = users.find((u) => u.id === userId)
          const nextActive = action === 'activate'
          const updates: Record<string, unknown> = { isActive: nextActive }
          if (user?.role === "cadete") {
            updates.status = nextActive ? "approved" : "rejected"
            if (nextActive) updates.approvedAt = serverTimestamp()
            else updates.rejectedAt = serverTimestamp()
          }
          await updateDoc(doc(db, "users", userId), updates)
        }
      }

      if (action === 'delete') {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)))
      } else {
        setUsers(users.map(u => {
          if (!selectedUsers.includes(u.id)) return u
          const nextActive = action === 'activate'
          return {
            ...u,
            isActive: nextActive,
            status: u.role === "cadete" ? (nextActive ? "approved" : "rejected") : u.status,
          }
        }))
      }

      setSelectedUsers([])
      setError(null)
    } catch (err) {
      console.error("Error in bulk action:", err)
      setError(t("errors.bulkAction"))
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredAllProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId])
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    }
  }

  const handleBulkProductAction = async (action: 'delete') => {
    if (selectedProducts.length === 0) {
      setError(t("errors.noProductsSelected"))
      return
    }

    if (!window.confirm(t("confirms.bulkDeleteProducts", { count: selectedProducts.length }))) return

    setBulkActionLoading(true)
    try {
      for (const productId of selectedProducts) {
        await deleteDoc(doc(db, "products", productId))
      }

      setAllProducts(allProducts.filter(p => !selectedProducts.includes(p.id)))
      setSelectedProducts([])
      setError(null)
    } catch (err) {
      console.error("Error in bulk product action:", err)
      setError(t("errors.bulkAction"))
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Lógica de filtrado y ordenamiento para todos los productos
  const filteredAllProducts = useMemo(() => {
    const tempProducts = allProducts.filter((product) => {
      const matchesSearchTerm =
        allProductsSearchTerm === "" ||
        product.name.toLowerCase().includes(allProductsSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(allProductsSearchTerm.toLowerCase())

      const matchesCategory = allProductsFilterCategory === "all" || product.category === allProductsFilterCategory

      const matchesSeller = allProductsFilterSeller === "all" || product.sellerId === allProductsFilterSeller

      const matchesType =
        allProductsFilterIsService === "all" ||
        (allProductsFilterIsService === "product" && !product.isService) ||
        (allProductsFilterIsService === "service" && product.isService)

      return matchesSearchTerm && matchesCategory && matchesSeller && matchesType
    })

    // Apply sorting
    if (allProductsSortOrder === "reviews_desc") {
      tempProducts.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    } else if (allProductsSortOrder === "price_asc") {
      tempProducts.sort((a, b) => a.price - b.price)
    } else if (allProductsSortOrder === "price_desc") {
      tempProducts.sort((a, b) => b.price - a.price)
    }
    // Default sort by createdAt if no specific sort is applied
    else {
      tempProducts.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
    }

    return tempProducts
  }, [
    allProducts,
    allProductsSearchTerm,
    allProductsFilterCategory,
    allProductsFilterSeller,
    allProductsFilterIsService,
    allProductsSortOrder,
  ])

  // Filtros visuales robustos sobre salesData
  const getFilteredSales = () => {
    return salesData.filter(sale => {
      // Filtro por estado de pago
      if (salesFilters.estadoPago && salesFilters.estadoPago !== 'all') {
        if (salesFilters.estadoPago === 'pendiente' && sale.pagado) return false
        if (salesFilters.estadoPago === 'pagado' && !sale.pagado) return false
      }
      
      // Filtro por estado de envío
      if (salesFilters.estadoEnvio && salesFilters.estadoEnvio !== 'all' && sale.status !== salesFilters.estadoEnvio) return false
      
      // Filtro por vendedor
      if (salesFilters.vendedorId && sale.vendedorId !== salesFilters.vendedorId) return false
      
      // Filtro por fecha
      if (salesFilters.fechaDesde) {
        const fechaCompra = new Date(sale.fechaCompra)
        const desde = new Date(salesFilters.fechaDesde)
        if (fechaCompra < desde) return false
      }
      if (salesFilters.fechaHasta) {
        const fechaCompra = new Date(sale.fechaCompra)
        const hasta = new Date(salesFilters.fechaHasta)
        if (fechaCompra > hasta) return false
      }
      
      // Filtro por monto
      if (salesFilters.montoMinimo && sale.productPrice < salesFilters.montoMinimo) return false
      if (salesFilters.montoMaximo && sale.productPrice > salesFilters.montoMaximo) return false
      
      return true
    })
  }
  
  const filteredSales = getFilteredSales()

  // Paginación
  const totalPages = Math.ceil(filteredSales.length / rowsPerPage)
  const paginatedSales = filteredSales.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  
  // Exportar a Excel solo lo filtrado y robusto
  const handleExportExcel = () => {
    const exportData = filteredSales.map(sale => ({
      compraId: sale.compraId || 'N/A',
      paymentId: sale.paymentId || 'N/A',
      estado: sale.status || 'N/A',
      fechaCompra: sale.fechaCompra || 'N/A',
      buyerId: sale.buyerId || 'N/A',
      comprador: sale.compradorNombre || sale.buyerId || 'N/A',
      productId: sale.productId || 'N/A',
      producto: sale.productName || 'N/A',
      precio: sale.productPrice ?? 'N/A',
      cantidad: sale.quantity ?? 'N/A',
      vendedorId: sale.vendedorId || 'N/A',
      vendedor: sale.vendedorNombre || sale.vendedorId || 'N/A',
      totalCompra: sale.totalAmount ?? 'N/A'
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t("sales.exportSheetName"))
    XLSX.writeFile(wb, t("sales.exportFileName"))
  }

  // 1. Agrupar ventas por compraId
  const comprasAgrupadas = useMemo(() => {
    const agrupadas: { [compraId: string]: { compra: Purchase, productos: VentaProductoAdmin[] } } = {}
    purchases.forEach(compra => {
      const productos = salesData.filter(s => s.compraId === compra.id)
      if (productos.length > 0) {
        agrupadas[compra.id] = { compra, productos }
      }
    })
    return agrupadas
  }, [purchases, salesData])

  // Handler temporal para el botón (al inicio del componente AdminDashboard)
  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowPurchaseModal(true);
  }

  const handleViewSeller = (vendedorId: string) => {
    setSelectedSellerId(vendedorId);
    setShowSellerModal(true);
  }

  // Función para buscar datos bancarios por vendedorId
  const fetchBankDataForSeller = async (vendedorId: string) => {
    const q = query(
      collection(db, "sellerBankConfigs"),
      where("vendedorId", "==", vendedorId)
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      return snap.docs[0].data()
    }
    return null
  }

  // Cargar los datos bancarios cuando se abre el modal de vendedor
  useEffect(() => {
    if (showSellerModal && selectedSellerId) {
      fetchBankDataForSeller(selectedSellerId).then(setBankData)
    } else {
      setBankData(null)
    }
  }, [showSellerModal, selectedSellerId])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("shell.accessDeniedTitle")}</AlertTitle>
          <AlertDescription>
            {t("shell.accessDeniedBeforeLogin")}{" "}
            <Link href="/login" className="underline">
              {t("shell.loginLink")}
            </Link>{" "}
            {t("shell.accessDeniedAfterLogin")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg text-gray-700">{t("shell.loading")}</span>
      </div>
    )
  }

  return (
    <div className="relative grid min-h-screen w-full max-w-full overflow-hidden lg:grid-cols-[280px_1fr] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      {/* Sidebar */}
      <div className="hidden border-r border-white/10 bg-[linear-gradient(180deg,#111827_0%,#1f1147_55%,#0f172a_100%)] text-white shadow-2xl lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[84px] items-center border-b border-white/10 px-6">
            <Link href="/" className="flex items-center gap-3 font-semibold" prefetch={false}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur">
                <Package2 className="h-6 w-6 text-purple-200" />
              </div>
              <div className="leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.28em] text-purple-200/70">{t("shell.brand")}</span>
                <span className="text-lg">{t("shell.controlCenter")}</span>
              </div>
            </Link>
          </div>
          <div className="px-4 pb-3 pt-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-purple-200/70">{t("shell.session")}</p>
              <p className="mt-2 text-sm text-white/80">{t("shell.sessionDescription")}</p>
            </div>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start gap-2 px-4 text-sm font-medium">
              {adminNavItems.map((item) => (
                <Button
                  key={item.tab}
                  variant={activeTab === item.tab ? "secondary" : "ghost"}
                  className={`relative flex items-center justify-start gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
                    activeTab === item.tab
                      ? "bg-white text-slate-950 shadow-lg shadow-black/20 ring-1 ring-white/20"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setActiveTab(item.tab)}
                >
                  {activeTab === item.tab && (
                    <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-fuchsia-400 to-cyan-300 shadow-[0_0_18px_rgba(168,85,247,0.45)]" />
                  )}
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header for mobile sidebar */}
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b border-white/10 bg-white/90 px-6 backdrop-blur lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t("shell.openMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="lg:hidden w-80 border-white/10 bg-slate-950 text-white">
              <div className="flex h-[84px] items-center border-b border-white/10 px-6">
                <Link href="/" className="flex items-center gap-3 font-semibold" prefetch={false}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                    <Package2 className="h-6 w-6 text-purple-200" />
                  </div>
                  <div className="leading-tight">
                    <span className="block text-[10px] uppercase tracking-[0.28em] text-purple-200/70">{t("shell.brand")}</span>
                    <span className="text-lg">{t("shell.controlCenter")}</span>
                  </div>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-base font-medium">
                {adminNavItems.map((item) => (
                  <Button
                    key={item.tab}
                    variant={activeTab === item.tab ? "secondary" : "ghost"}
                    className={`relative flex items-center justify-start gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
                      activeTab === item.tab
                        ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => {
                      setActiveTab(item.tab)
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    {activeTab === item.tab && (
                      <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-fuchsia-400 to-cyan-300" />
                    )}
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-lg md:text-2xl text-gray-800 flex-1 text-center lg:text-left">
            {t("shell.pageTitle")}
          </h1>
        </header>

        {/* Main Area with Tabs */}
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("alerts.errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Responsive TabsList */}
            <TabsList className="flex w-full overflow-x-auto justify-start sm:justify-center md:justify-start bg-white border-b pb-2 hidden lg:flex">
              <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
              <TabsTrigger value="categories">{t("tabs.categories")}</TabsTrigger>
              <TabsTrigger value="brands">{t("tabs.brands")}</TabsTrigger>
              <TabsTrigger value="allProducts">{t("tabs.allProducts")}</TabsTrigger>
              <TabsTrigger value="sales">{t("tabs.sales")}</TabsTrigger>
              <TabsTrigger value="banners">{t("tabs.banners")}</TabsTrigger>
              <TabsTrigger value="alerts">{t("tabs.alerts")}</TabsTrigger>
              <TabsTrigger value="coupons">{t("tabs.coupons")}</TabsTrigger>
              <TabsTrigger value="subscriptionPricing">{t("tabs.subscriptionPricing")}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <div className="space-y-6">
                {/* Métricas principales */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">{t("overview.totalUsers")}</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {t("overview.activeUsers", { count: users.filter(u => u.isActive).length })}
                      </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{t("overview.totalProducts")}</CardTitle>
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{products.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {t("overview.productsServicesBreakdown", { products: products.filter(p => !p.isService).length, services: products.filter(p => p.isService).length })}
                      </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{t("overview.totalSales")}</CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{fmtNum(salesSummary.totalVentas)}</div>
                      <p className="text-xs text-muted-foreground">
                        {t("overview.commissionsAmount", { amount: fmtNum(salesSummary.totalComisiones) })}
                      </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{t("overview.notifications")}</CardTitle>
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{notifications.filter(n => !n.isRead).length}</div>
                      <p className="text-xs text-muted-foreground">
                        {t("overview.totalCount", { count: notifications.length })}
                      </p>
                  </CardContent>
                </Card>
                </div>

                {/* Distribución por categorías */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("overview.categoryDistributionTitle")}</CardTitle>
                    <CardDescription>
                      {t("overview.categoryDistributionDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categories.map((category) => {
                        const categoryProducts = products.filter(p => p.category === category.name)
                        const percentage = products.length > 0 ? (categoryProducts.length / products.length) * 100 : 0
                        return (
                          <div key={category.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-blue-500 rounded"></div>
                              <span className="text-sm font-medium">{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 w-16 text-right">
                                {categoryProducts.length} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Estadísticas adicionales */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{t("overview.categories")}</CardTitle>
                      <List className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{categories.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{t("overview.brands")}</CardTitle>
                      <Tag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{brands.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{t("overview.activeBanners")}</CardTitle>
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{banners.filter(b => b.isActive).length}</div>
                      <p className="text-xs text-muted-foreground">{t("common.ofTotal", { total: banners.length })}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">{t("overview.activeCoupons")}</CardTitle>
                    <Percent className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{coupons.filter(c => c.isActive).length}</div>
                      <p className="text-xs text-muted-foreground">
                        {t("overview.totalCouponUses", { count: coupons.reduce((total, coupon) => total + coupon.usedCount, 0) })}
                      </p>
                  </CardContent>
                </Card>
                </div>

                {/* Top vendedores */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("overview.topSellersTitle")}</CardTitle>
                    <CardDescription>
                      {t("overview.topSellersDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {salesSummary.ventasPorVendedor && salesSummary.ventasPorVendedor.length > 0 ? (
                        salesSummary.ventasPorVendedor
                          .sort((a, b) => b.totalVentas - a.totalVentas)
                          .slice(0, 5)
                          .map((vendedor, index) => (
                            <div key={vendedor.vendedorId} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{vendedor.vendedorNombre}</div>
                                  <div className="text-sm text-gray-500">{t("overview.salesAmount", { amount: fmtNum(vendedor.totalVentas) })}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">{fmtNum(vendedor.totalComisiones)}</div>
                                <div className="text-sm text-gray-500">{t("overview.commissionsLabel")}</div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {t("overview.noSalesData")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("users.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Acciones masivas */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                          {t("users.selectedCount", { count: selectedUsers.length })}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleBulkUserAction('activate')}
                            disabled={bulkActionLoading}
                          >
                            {bulkActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2">{t("common.activate")}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkUserAction('deactivate')}
                            disabled={bulkActionLoading}
                          >
                            <X className="h-4 w-4" />
                            <span className="ml-2">{t("common.deactivate")}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBulkUserAction('delete')}
                            disabled={bulkActionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2">{t("common.delete")}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] p-1 md:p-2">
                            <Checkbox
                              checked={selectedUsers.length === users.length && users.length > 0}
                              onCheckedChange={handleSelectAllUsers}
                            />
                          </TableHead>
                          <TableHead className="w-[50px] p-1 md:p-2">{t("common.profile")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.name")}</TableHead>
                          <TableHead className="p-1 md:p-2 max-w-[100px] truncate">{t("common.email")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.role")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.status")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.name} />
                                <AvatarFallback>
                                  <User className="h-4 w-4 md:h-5 md:w-5" />
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[80px] truncate">{user.name}</TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[100px] truncate">{user.email}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "destructive"
                                    : user.role === "seller"
                                      ? "outline"
                                      : "secondary"
                                }
                              >
                                {user.role || "user"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {user.isActive ? t("common.active") : t("common.inactive")}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserActive(user.id, user.isActive)}
                              >
                                {user.isActive ? t("common.deactivate") : t("common.activate")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cadetes Tab */}
            <TabsContent value="cadetes" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("cadetes.title")}</CardTitle>
                  <CardDescription>
                    Aprobá o rechazá postulaciones. Solo los aprobados pueden tomar pedidos del pool.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const cadetes = users.filter((u) => u.role === "cadete")
                    const pending = cadetes.filter((u) => u.status === "pending_approval" || (!u.status && !u.isActive))
                    if (cadetes.length === 0) {
                      return (
                        <p className="py-8 text-center text-gray-500">
                          {t("cadetes.empty")}
                        </p>
                      )
                    }
                    return (
                      <div className="space-y-6">
                        {pending.length > 0 && (
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            {t("cadetes.pendingBanner", { count: pending.length })}
                          </p>
                        )}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("common.name")}</TableHead>
                                <TableHead>{t("cadetes.contact")}</TableHead>
                                <TableHead className="hidden md:table-cell">{t("cadetes.zone")}</TableHead>
                                <TableHead className="hidden md:table-cell">{t("cadetes.vehicle")}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t("cadetes.document")}</TableHead>
                                <TableHead>{t("common.status")}</TableHead>
                                <TableHead>{t("common.actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cadetes
                                .slice()
                                .sort((a, b) => {
                                  const rank = (s?: string) =>
                                    s === "pending_approval" ? 0 : s === "approved" ? 1 : 2
                                  return rank(a.status) - rank(b.status)
                                })
                                .map((cadete) => {
                                  const status = (cadete.status || "pending_approval") as CadeteStatus
                                  return (
                                    <TableRow key={cadete.id}>
                                      <TableCell className="font-medium">{cadete.name}</TableCell>
                                      <TableCell>
                                        <div className="text-sm">{cadete.email}</div>
                                        {cadete.phone && (
                                          <div className="text-xs text-muted-foreground">{cadete.phone}</div>
                                        )}
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell">{cadete.zone || "—"}</TableCell>
                                      <TableCell className="hidden md:table-cell">{cadete.vehicle || "—"}</TableCell>
                                      <TableCell className="hidden lg:table-cell">{cadete.documentId || "—"}</TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            status === "approved"
                                              ? "default"
                                              : status === "rejected"
                                                ? "destructive"
                                                : "secondary"
                                          }
                                        >
                                          {getCadeteStatusLabel(t, status)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                          {status !== "approved" && (
                                            <Button
                                              size="sm"
                                              className="bg-green-600 hover:bg-green-700"
                                              onClick={() => void handleApproveCadete(cadete.id)}
                                            >
                                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                              Aprobar
                                            </Button>
                                          )}
                                          {status !== "rejected" && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => void handleRejectCadete(cadete.id)}
                                            >
                                              <XCircle className="mr-1 h-3.5 w-3.5" />
                                              Rechazar
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("categories.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddCategory()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">{t("categories.addTitle")}</h3>
                    <div>
                      <Label htmlFor="newCategoryName">{t("categories.categoryName")}</Label>
                      <Input
                        id="newCategoryName"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newCategoryDescription">{t("categories.descriptionOptional")}</Label>
                      <Textarea
                        id="newCategoryDescription"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        placeholder={t("categories.descriptionPlaceholder")}
                      />
                    </div>
                    {/* Image Upload for Category */}
                    <div>
                      <Label htmlFor="newCategoryImage">{t("categories.imageOptional")}</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newCategoryImagePreviewUrl ? (
                            <Image
                              src={newCategoryImagePreviewUrl || "/placeholder.svg"}
                              alt={t("categories.previewAlt")}
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newCategoryImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewCategoryImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                        />
                        {newCategoryImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCategoryImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> {t("common.removeImage")}
                          </Button>
                        )}
                      </div>
                      {uploadingCategoryImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.uploadingImage")}
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingCategory || uploadingCategoryImage}>
                      {addingCategory || uploadingCategoryImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {t("categories.addButton")}
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] p-1 md:p-2">{t("common.image")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.name")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.description")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((cat) => (
                          <TableRow key={cat.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              {cat.imageUrl ? (
                                <Image
                                  src={cat.imageUrl || "/placeholder.svg"}
                                  alt={cat.name}
                                  width={36}
                                  height={36}
                                  className="rounded object-cover aspect-square md:w-[50px] md:h-[50px]"
                                />
                              ) : (
                                <div className="w-[36px] h-[36px] md:w-[50px] md:h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="p-1 md:p-2 font-medium">{cat.name}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 text-sm text-muted-foreground truncate max-w-xs">{cat.description || "-"}</TableCell>
                            <TableCell className="p-1 md:p-2">
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditCategory(cat)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name, cat.imagePath)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Category Edit Form */}
                  {editingCategory && (
                    <div className="mt-6 p-4 border rounded-lg bg-gray-50 space-y-3">
                      <h3 className="text-lg font-medium">{t("categories.editTitle", { name: editingCategory.name })}</h3>
                      <div>
                        <Label htmlFor="editCategoryName">{t("categories.categoryName")}</Label>
                        <Input
                          id="editCategoryName"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="editCategoryDescription">{t("categories.descriptionOptional")}</Label>
                        <Textarea
                          id="editCategoryDescription"
                          value={editCategoryDescription}
                          onChange={(e) => setEditCategoryDescription(e.target.value)}
                          placeholder={t("categories.descriptionPlaceholder")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editCategoryImage">{t("categories.imageOptional")}</Label>
                        <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                          <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                            {editCategoryImagePreviewUrl ? (
                              <Image
                                src={editCategoryImagePreviewUrl}
                                alt={t("categories.previewAlt")}
                                layout="fill"
                                objectFit="contain"
                              />
                            ) : (
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                            )}
                          </div>
                          <Input
                            id="editCategoryImage"
                            type="file"
                            accept="image/*"
                            onChange={handleEditCategoryImageChange}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-purple-50 file:text-purple-700
                              hover:file:bg-purple-100 cursor-pointer"
                          />
                          {editCategoryImagePreviewUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveEditCategoryImage}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="mr-1 h-4 w-4" /> {t("common.removeImage")}
                            </Button>
                          )}
                        </div>
                        {uploadingEditCategoryImage && (
                          <p className="text-sm text-purple-600 mt-2 flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.uploadingImage")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveCategoryEdit} 
                          disabled={uploadingEditCategoryImage}
                        >
                          {uploadingEditCategoryImage ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          {t("common.saveChanges")}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCancelCategoryEdit}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Brands Tab */}
            <TabsContent value="brands" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("brands.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddBrand()
                    }}
                    className="mb-6 p-4 border rounded-lg space-y-3"
                  >
                    <h3 className="text-lg font-medium">{t("brands.addTitle")}</h3>
                    <div>
                      <Label htmlFor="newBrandName">{t("brands.brandName")}</Label>
                      <Input
                        id="newBrandName"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        required
                      />
                    </div>
                    {/* Image Upload for Brand */}
                    <div>
                      <Label htmlFor="newBrandImage">{t("brands.logoOptional")}</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newBrandImagePreviewUrl ? (
                            <Image
                              src={newBrandImagePreviewUrl || "/placeholder.svg"}
                              alt={t("brands.previewAlt")}
                              layout="fill"
                              objectFit="contain"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newBrandImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewBrandImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                        />
                        {newBrandImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveBrandImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> {t("common.removeImage")}
                          </Button>
                        )}
                      </div>
                      {uploadingBrandImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.uploadingImage")}
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingBrand || uploadingBrandImage}>
                      {addingBrand || uploadingBrandImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {t("brands.addButton")}
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    {" "}
                    {/* Added for responsiveness */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">{t("brands.logo")}</TableHead>
                          <TableHead>{t("common.name")}</TableHead>
                          <TableHead>{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brands.map((brand) => (
                          <TableRow key={brand.id}>
                            <TableCell>
                              {brand.imageUrl ? (
                                <Image
                                  src={brand.imageUrl || "/placeholder.svg"}
                                  alt={brand.name}
                                  width={50}
                                  height={50}
                                  className="rounded object-contain aspect-square"
                                />
                              ) : (
                                <div className="w-[50px] h-[50px] bg-gray-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{brand.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditBrand(brand)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteBrand(brand.id, brand.name, brand.imagePath)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Brand Edit Form */}
                  {editingBrand && (
                    <div className="mt-6 p-4 border rounded-lg bg-gray-50 space-y-3">
                      <h3 className="text-lg font-medium">{t("brands.editTitle", { name: editingBrand.name })}</h3>
                      <div>
                        <Label htmlFor="editBrandName">{t("brands.brandName")}</Label>
                        <Input
                          id="editBrandName"
                          value={editBrandName}
                          onChange={(e) => setEditBrandName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="editBrandImage">{t("brands.logoOptional")}</Label>
                        <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                          <div className="w-24 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                            {editBrandImagePreviewUrl ? (
                              <Image
                                src={editBrandImagePreviewUrl}
                                alt={t("brands.previewAlt")}
                                layout="fill"
                                objectFit="contain"
                              />
                            ) : (
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                            )}
                          </div>
                          <Input
                            id="editBrandImage"
                            type="file"
                            accept="image/*"
                            onChange={handleEditBrandImageChange}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-purple-50 file:text-purple-700
                              hover:file:bg-purple-100 cursor-pointer"
                          />
                          {editBrandImagePreviewUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveEditBrandImage}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="mr-1 h-4 w-4" /> {t("common.removeImage")}
                            </Button>
                          )}
                        </div>
                        {uploadingEditBrandImage && (
                          <p className="text-sm text-purple-600 mt-2 flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.uploadingImage")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveBrandEdit} 
                          disabled={uploadingEditBrandImage}
                        >
                          {uploadingEditBrandImage ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          {t("common.saveChanges")}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCancelBrandEdit}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Todos los Productos Tab */}
            <TabsContent value="allProducts" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card className="w-full max-w-full">
                <CardHeader>
                  <CardTitle>{t("allProducts.title")}</CardTitle>
                  <CardDescription>
                    {t("allProducts.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-1 xs:px-2 sm:px-4 md:px-6 py-2 w-full max-w-full">
                  {/* Filtros para todos los productos */}
                  <div className="mb-4 sm:mb-6 w-full max-w-full px-0 py-2 border rounded-lg bg-white flex flex-col gap-2 xs:gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                    <div className="w-full max-w-full">
                      <Label htmlFor="allProductsSearchTerm">{t("allProducts.search")}</Label>
                      <Input
                        id="allProductsSearchTerm"
                        placeholder={t("allProducts.searchPlaceholder")}
                        value={allProductsSearchTerm}
                        onChange={(e) => setAllProductsSearchTerm(e.target.value)}
                        className="text-xs xs:text-sm w-full max-w-full"
                      />
                    </div>
                    <div className="w-full max-w-full">
                      <Label htmlFor="allProductsFilterCategory">{t("allProducts.category")}</Label>
                      <Select value={allProductsFilterCategory} onValueChange={setAllProductsFilterCategory}>
                        <SelectTrigger className="text-xs xs:text-sm w-full max-w-full">
                          <SelectValue placeholder={t("allProducts.allCategories")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("allProducts.allCategories")}</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="text-xs xs:text-sm">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full max-w-full">
                      <Label htmlFor="allProductsFilterSeller">{t("common.seller")}</Label>
                      <Select value={allProductsFilterSeller} onValueChange={setAllProductsFilterSeller}>
                        <SelectTrigger className="text-xs xs:text-sm w-full max-w-full">
                          <SelectValue placeholder={t("allProducts.allSellers")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("allProducts.allSellers")}</SelectItem>
                          {users
                            .filter((user) => user.role === "seller")
                            .map((seller) => (
                              <SelectItem key={seller.id} value={seller.id} className="text-xs xs:text-sm">
                                {seller.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full max-w-full">
                      <Label htmlFor="allProductsFilterType">{t("allProducts.type")}</Label>
                      <Select value={allProductsFilterIsService} onValueChange={setAllProductsFilterIsService}>
                        <SelectTrigger className="text-xs xs:text-sm w-full max-w-full">
                          <SelectValue placeholder={t("allProducts.allTypes")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("sales.filters.payment.all")}</SelectItem>
                          <SelectItem value="product">{t("common.products")}</SelectItem>
                          <SelectItem value="service">{t("common.services")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full max-w-full sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="allProductsSortOrder">{t("allProducts.sortBy")}</Label>
                      <Select value={allProductsSortOrder} onValueChange={setAllProductsSortOrder}>
                        <SelectTrigger className="text-xs xs:text-sm w-full max-w-full">
                          <SelectValue placeholder={t("allProducts.sortDefaultPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{t("allProducts.sortDefault")}</SelectItem>
                          <SelectItem value="reviews_desc">{t("allProducts.sortReviewsDesc")}</SelectItem>
                          <SelectItem value="price_asc">{t("allProducts.sortPriceAsc")}</SelectItem>
                          <SelectItem value="price_desc">{t("allProducts.sortPriceDesc")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tabla de todos los productos */}
                  <div className="rounded-md border overflow-x-auto w-full max-w-full">
                    <Table className="min-w-[320px] xs:min-w-[360px] sm:min-w-[400px] md:min-w-[500px] w-full max-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-1 md:p-2 w-[100px] xs:w-[110px] text-xs">{t("common.product")}</TableHead>
                          <TableHead className="p-1 md:p-2 w-[60px] xs:w-[70px] text-xs">{t("common.price")}</TableHead>
                          <TableHead className="p-1 md:p-2 w-[70px] xs:w-[90px] text-xs">{t("common.seller")}</TableHead>
                          {/* Solo en sm+ */}
                          <TableHead className="hidden sm:table-cell p-1 md:p-2 w-[50px] xs:w-[60px] text-xs">{t("allProducts.type")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2 w-[50px] xs:w-[60px] text-xs">{t("allProducts.reviews")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2 w-[60px] xs:w-[80px] text-xs">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAllProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-xs">
                              {t("allProducts.empty")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAllProducts.map((product) => (
                            <TableRow key={product.id} className="text-xs xs:text-sm md:text-sm">
                              <TableCell className="p-1 md:p-2 max-w-[100px] xs:max-w-[110px] align-middle">
                                <div className="flex items-center gap-1 xs:gap-2 md:gap-3 min-w-0">
                                  <div className="h-6 w-6 xs:h-7 xs:w-7 md:h-10 md:w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Image
                                      src={getDashboardProductImage(product.media, product.imageUrl)}
                                      alt={product.name}
                                      width={24}
                                      height={24}
                                      className="object-cover xs:w-[28px] xs:h-[28px] md:w-[40px] md:h-[40px]"
                                    />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium truncate max-w-[60px] xs:max-w-[70px] text-xs xs:text-sm md:text-sm">{product.name}</span>
                                    <span className="text-[10px] text-gray-500 truncate max-w-[70px] xs:max-w-[80px]">{product.description}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="p-1 md:p-2 whitespace-nowrap align-middle">{fmtCur(product.price)}</TableCell>
                              <TableCell className="p-1 md:p-2 max-w-[70px] xs:max-w-[90px] align-middle">
                                <div className="flex items-center gap-1 xs:gap-2 md:gap-2 min-w-0">
                                  <Avatar className="h-4 w-4 xs:h-5 xs:w-5 md:h-8 md:w-8 flex-shrink-0">
                                    <AvatarImage src={product.seller?.photoURL || "/placeholder.svg"} />
                                    <AvatarFallback>
                                      <User className="h-3 w-3 md:h-4 md:w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] xs:text-xs md:text-xs max-w-[40px] xs:max-w-[60px] truncate">{product.seller?.name || t("common.sellerFallback")}</span>
                                </div>
                              </TableCell>
                              {/* Solo en sm+ */}
                              <TableCell className="hidden sm:table-cell p-1 md:p-2 align-middle">
                                <Badge variant={product.isService ? "outline" : "secondary"} className="text-[10px] md:text-xs">
                                  {product.isService ? t("common.service") : t("common.product")}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell p-1 md:p-2 align-middle">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{product.averageRating?.toFixed(1) || "N/A"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell p-1 md:p-2 align-middle">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAllProduct(product.id, product.name)}
                                  disabled={deletingProductId === product.id}
                                >
                                  {deletingProductId === product.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-1" /> {t("common.delete")}
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ventas y Comisiones Tab */}
            <TabsContent value="sales" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <div className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] space-y-4 w-full">
                {/* Resumen de Ventas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                  <Card className="w-full">
                    <CardHeader className="pb-1 xs:pb-2">
                      <CardTitle className="text-base xs:text-lg md:text-sm font-medium">{t("sales.totalSales")}</CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 md:p-6">
                      <div className="text-xl xs:text-2xl font-bold">{fmtNum(salesSummary.totalVentas)}</div>
                      <p className="text-xs text-muted-foreground">{t("sales.grossSalesHint")}</p>
                    </CardContent>
                  </Card>
                  <Card className="w-full">
                    <CardHeader className="pb-1 xs:pb-2">
                      <CardTitle className="text-base xs:text-lg md:text-sm font-medium">{t("sales.commissions")}</CardTitle>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 md:p-6">
                      <div className="text-xl xs:text-2xl font-bold">{fmtNum(salesSummary.totalComisiones)}</div>
                      <p className="text-xs text-muted-foreground">{t("sales.commissionRateHint")}</p>
                    </CardContent>
                  </Card>
                  <Card className="w-full">
                    <CardHeader className="pb-1 xs:pb-2">
                      <CardTitle className="text-base xs:text-lg md:text-sm font-medium">{t("sales.pendingPayment")}</CardTitle>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 md:p-6">
                      <div className="text-xl xs:text-2xl font-bold">{fmtNum(salesSummary.totalPendientePago)}</div>
                      <p className="text-xs text-muted-foreground">{t("sales.pendingToSellersHint")}</p>
                    </CardContent>
                  </Card>
                  <Card className="w-full">
                    <CardHeader className="pb-1 xs:pb-2">
                      <CardTitle className="text-base xs:text-lg md:text-sm font-medium">{t("sales.paid")}</CardTitle>
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 md:p-6">
                      <div className="text-xl xs:text-2xl font-bold">{fmtNum(salesSummary.totalPagado)}</div>
                      <p className="text-xs text-muted-foreground">{t("sales.paidToSellersHint")}</p>
                    </CardContent>
                  </Card>
                </div>
                {/* Filtros y Ordenamiento */}
                <Card className="w-full">
                  <CardHeader className="pb-2 xs:pb-3">
                    <CardTitle className="text-lg xs:text-xl md:text-2xl">{t("sales.filtersTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 md:p-6">
                    <div className="space-y-2 xs:space-y-4 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                        <div className="w-full">
                          <Label htmlFor="filterEstadoPago" className="text-xs xs:text-sm">{t("sales.paymentStatus")}</Label>
                          <Select value={salesFilters.estadoPago} onValueChange={(value) => setSalesFilters({...salesFilters, estadoPago: value as any})}>
                            <SelectTrigger className="text-xs xs:text-sm w-full h-8 xs:h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("sales.filters.payment.all")}</SelectItem>
                              <SelectItem value="pendiente">{t("sales.filters.payment.pendiente")}</SelectItem>
                              <SelectItem value="pagado">{t("sales.filters.payment.pagado")}</SelectItem>
                              <SelectItem value="cancelado">{t("sales.filters.payment.cancelado")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full">
                          <Label htmlFor="filterEstadoEnvio" className="text-xs xs:text-sm">{t("sales.shippingStatus")}</Label>
                          <Select value={salesFilters.estadoEnvio || 'all'} onValueChange={(value) => setSalesFilters({...salesFilters, estadoEnvio: value === 'all' ? undefined : value as any})}>
                            <SelectTrigger className="text-xs xs:text-sm w-full h-8 xs:h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("sales.filters.payment.all")}</SelectItem>
                              <SelectItem value="pendiente">{t("sales.filters.payment.pendiente")}</SelectItem>
                              <SelectItem value="en_preparacion">{t("sales.filters.shipping.en_preparacion")}</SelectItem>
                              <SelectItem value="enviado">{t("sales.filters.shipping.enviado")}</SelectItem>
                              <SelectItem value="entregado">{t("sales.filters.shipping.entregado")}</SelectItem>
                              <SelectItem value="cancelado">{t("sales.filters.payment.cancelado")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full">
                          <Label htmlFor="filterVendedor" className="text-xs xs:text-sm">{t("common.seller")}</Label>
                          <Select value={salesFilters.vendedorId || 'all'} onValueChange={(value) => setSalesFilters({...salesFilters, vendedorId: value === 'all' ? undefined : value})}>
                            <SelectTrigger className="text-xs xs:text-sm w-full h-8 xs:h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("sales.filters.payment.all")}</SelectItem>
                              {salesSummary.ventasPorVendedor.map((vendedor) => (
                                <SelectItem key={vendedor.vendedorId} value={vendedor.vendedorId} className="text-xs xs:text-sm">
                                  {vendedor.vendedorNombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end w-full">
                          <Button variant="outline" onClick={() => { setSalesFilters({estadoPago: 'all', estadoEnvio: 'all'}); setSalesSorting({field: 'fecha', order: 'desc'}); }} className="w-full h-8 xs:h-9 text-xs xs:text-sm">
                            <X className="mr-2 h-4 w-4" /> {t("common.clear")}
                          </Button>
                        </div>
                      </div>
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input placeholder={t("sales.searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-xs xs:text-sm w-full h-8 xs:h-9" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs xs:text-sm text-muted-foreground w-full">
                        <span>{t("sales.showingPurchases", { filtered: filteredPurchases.length, total: purchases.length })}</span>
                        {(salesFilters.estadoPago !== 'all' || salesFilters.estadoEnvio !== 'all' || salesFilters.vendedorId || searchTerm) && (
                          <Badge variant="outline">{t("common.filtersApplied")}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Tabla de compras */}
                <Card className="w-full">
                  <CardHeader className="pb-2 xs:pb-3">
                    <CardTitle className="text-lg xs:text-xl md:text-2xl">{t("sales.purchasesTitle")}</CardTitle>
                    <CardDescription className="text-xs xs:text-sm">{t("sales.purchasesDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 md:p-6">
                    {loadingSales ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <span className="ml-2">{t("sales.loadingPurchases")}</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <Table className="min-w-[700px] w-full text-xs sm:text-sm">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-1 md:p-2 w-[90px] text-xs">{t("common.date")}</TableHead>
                              <TableHead className="p-1 md:p-2 w-[160px] text-xs">{t("common.products")}</TableHead>
                              <TableHead className="p-1 md:p-2 w-[100px] text-xs">{t("common.buyer")}</TableHead>
                              <TableHead className="p-1 md:p-2 w-[80px] text-xs">{t("common.total")}</TableHead>
                              <TableHead className="p-1 md:p-2 w-[80px] text-xs">{t("common.status")}</TableHead>
                              <TableHead className="p-1 md:p-2 w-[110px] text-xs">{t("sales.paymentToSellers")}</TableHead>
                              <TableHead className="p-1 md:p-2 w-[100px] text-xs">{t("common.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPurchases.map((compra) => {
                              const allPaid = compra.paidToSellers === true || (Array.isArray(compra.products) && compra.products.every((p: any) => p.paidToSeller === true));
                              return (
                                <TableRow key={compra.id} className="text-xs sm:text-sm">
                                  <TableCell className="p-1 md:p-2 align-middle">{new Date(compra.createdAt?.toDate?.() || compra.createdAt).toLocaleDateString(dateLocale)}</TableCell>
                                  <TableCell className="p-1 md:p-2 align-middle max-w-[160px] truncate">
                                    <ul className="list-disc pl-4">
                                      {Array.isArray(compra.products) && compra.products.map((p, idx) => (
                                        <li key={idx} className="truncate text-xs sm:text-sm">{p.nombre || p.productName || p.productoNombre || t('common.product')} (x{p.quantity || p.cantidad || 1})</li>
                                      ))}
                                    </ul>
                                  </TableCell>
                                  <TableCell className="p-1 md:p-2 align-middle max-w-[100px] truncate">{usersMap[compra.buyerId]?.name || compra.buyerId}</TableCell>
                                  <TableCell className="p-1 md:p-2 align-middle whitespace-nowrap">{fmtNum(compra.totalAmount || 0)}</TableCell>
                                  <TableCell className="p-1 md:p-2 align-middle">
                                    <Badge variant={compra.status === 'approved' ? 'default' : 'secondary'}>{getPurchaseStatusLabel(t, compra.status)}</Badge>
                                  </TableCell>
                                  <TableCell className="p-1 md:p-2 align-middle">
                                    {allPaid ? (
                                      <Badge variant="default">{t("common.paid")}</Badge>
                                    ) : (
                                      <Badge variant="secondary">{t("sales.pendingSellerPayment")}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="p-1 md:p-2 align-middle">
                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(compra)} className="text-xs sm:text-sm">{t("common.viewDetails")}</Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                        {filteredPurchases.length === 0 && (
                          <div className="text-center py-8 text-gray-500">{purchases.length === 0 ? t("sales.noPurchases") : t("sales.noPurchasesFiltered")}</div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Banners Tab */}
            <TabsContent value="banners" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("banners.title")}</CardTitle>
                  <CardDescription>
                    {t("banners.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddBanner()
                    }}
                    className="mb-6 flex flex-col gap-2 md:p-4 border rounded-lg"
                  >
                    <h3 className="text-lg font-medium">{t("banners.addTitle")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newBannerTitle">{t("banners.bannerTitle")}</Label>
                        <Input
                          id="newBannerTitle"
                          value={newBannerTitle}
                          onChange={(e) => setNewBannerTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newBannerOrder">{t("banners.displayOrder")}</Label>
                        <Input
                          id="newBannerOrder"
                          type="number"
                          min="1"
                          value={newBannerOrder}
                          onChange={(e) => setNewBannerOrder(parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newBannerDescription">{t("categories.descriptionOptional")}</Label>
                      <Textarea
                        id="newBannerDescription"
                        value={newBannerDescription}
                        onChange={(e) => setNewBannerDescription(e.target.value)}
                        placeholder={t("banners.descriptionPlaceholder")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newBannerLinkUrl">{t("banners.linkUrlOptional")}</Label>
                      <Input
                        id="newBannerLinkUrl"
                        type="url"
                        value={newBannerLinkUrl}
                        onChange={(e) => setNewBannerLinkUrl(e.target.value)}
                        placeholder={t("banners.linkPlaceholder")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newBannerImage">{t("banners.bannerImage")}</Label>
                      <div className="mt-2 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                        <div className="w-48 h-24 relative flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                          {newBannerImagePreviewUrl ? (
                            <Image
                              src={newBannerImagePreviewUrl}
                              alt={t("banners.previewAlt")}
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="newBannerImage"
                          type="file"
                          accept="image/*"
                          onChange={handleNewBannerImageChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100 cursor-pointer"
                          required
                        />
                        {newBannerImagePreviewUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveBannerImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-1 h-4 w-4" /> {t("common.removeImage")}
                          </Button>
                        )}
                      </div>
                      {uploadingBannerImage && (
                        <p className="text-sm text-purple-600 mt-2 flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.uploadingImage")}
                        </p>
                      )}
                    </div>
                    <Button type="submit" disabled={addingBanner || uploadingBannerImage}>
                      {addingBanner || uploadingBannerImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {t("banners.addButton")}
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-1 md:p-2">{t("common.image")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("banners.bannerTitle")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("banners.order")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.status")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banners.map((banner) => (
                          <TableRow key={banner.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              <div className="w-20 h-10 md:w-32 md:h-16 relative rounded-md overflow-hidden">
                                <Image src={banner.imageUrl} alt={banner.title} layout="fill" objectFit="cover" />
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[100px] truncate">
                                <div className="font-medium">{banner.title}</div>
                              {banner.description && <div className="text-xs text-gray-500 truncate">{banner.description}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">{banner.order}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="flex items-center gap-2">
                                <Switch checked={banner.isActive} onCheckedChange={() => handleToggleBannerActive(banner.id, banner.isActive)} />
                                <Badge variant={banner.isActive ? "default" : "secondary"}>{banner.isActive ? t("common.active") : t("common.inactive")}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteBanner(banner.id, banner.title, banner.imagePath)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alertas Tab */}
            <TabsContent value="alerts" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("offerAlerts.title")}</CardTitle>
                  <CardDescription>
                    {t("offerAlerts.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddAlert()
                    }}
                    className="mb-6 flex flex-col gap-2 md:p-4 border rounded-lg"
                  >
                    <h3 className="text-lg font-medium">{t("offerAlerts.addTitle")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newAlertTitle">{t("offerAlerts.alertTitle")}</Label>
                        <Input
                          id="newAlertTitle"
                          value={newAlertTitle}
                          onChange={(e) => setNewAlertTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newAlertType">{t("offerAlerts.alertType")}</Label>
                        <Select value={newAlertType} onValueChange={(value: "info" | "warning" | "success" | "error") => setNewAlertType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">{t("offerAlerts.types.info")}</SelectItem>
                            <SelectItem value="warning">{t("offerAlerts.types.warning")}</SelectItem>
                            <SelectItem value="success">{t("offerAlerts.types.success")}</SelectItem>
                            <SelectItem value="error">{t("alerts.errorTitle")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newAlertMessage">{t("offerAlerts.message")}</Label>
                      <Textarea
                        id="newAlertMessage"
                        value={newAlertMessage}
                        onChange={(e) => setNewAlertMessage(e.target.value)}
                        placeholder={t("offerAlerts.messagePlaceholder")}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newAlertStartDate">{t("offerAlerts.startDate")}</Label>
                        <Input
                          id="newAlertStartDate"
                          type="datetime-local"
                          value={newAlertStartDate}
                          onChange={(e) => setNewAlertStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newAlertEndDate">{t("offerAlerts.endDateOptional")}</Label>
                        <Input
                          id="newAlertEndDate"
                          type="datetime-local"
                          value={newAlertEndDate}
                          onChange={(e) => setNewAlertEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={addingAlert}>
                      {addingAlert ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {t("offerAlerts.createButton")}
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-1 md:p-2">{t("offerAlerts.type")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.title")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("offerAlerts.message")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("offerAlerts.dates")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.status")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offerAlerts.map((alert) => (
                          <TableRow key={alert.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2">
                              <Badge variant={alert.type === "info" ? "default" : alert.type === "warning" ? "secondary" : alert.type === "success" ? "default" : "destructive"}>
                                {alert.type === "info" && t("offerAlerts.types.infoShort")}
                                {alert.type === "warning" && t("offerAlerts.types.warning")}
                                {alert.type === "success" && t("offerAlerts.types.success")}
                                {alert.type === "error" && t("alerts.errorTitle")}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[80px] truncate font-medium">{alert.title}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 max-w-[120px] truncate">{alert.message}</TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 text-xs">
                                <div>{t('common.start')}: {alert.startDate?.toDate?.()?.toLocaleDateString() || t("common.now")}</div>
                              {alert.endDate && <div>{t('common.end')}: {alert.endDate?.toDate?.()?.toLocaleDateString()}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="flex items-center gap-2">
                                <Switch checked={alert.isActive} onCheckedChange={() => handleToggleAlertActive(alert.id, alert.isActive)} />
                                <Badge variant={alert.isActive ? "default" : "secondary"}>{alert.isActive ? t("common.activeF") : t("common.inactiveF")}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteAlert(alert.id, alert.title)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cupones Tab */}
            <TabsContent value="coupons" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("coupons.title")}</CardTitle>
                  <CardDescription>
                    {t("coupons.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddCoupon()
                    }}
                    className="mb-6 flex flex-col gap-2 md:p-4 border rounded-lg"
                  >
                    <h3 className="text-lg font-medium">{t("coupons.addTitle")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCouponCode">{t("coupons.code")}</Label>
                        <Input
                          id="newCouponCode"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          placeholder={t("coupons.codePlaceholder")}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponName">{t("coupons.name")}</Label>
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
                      <Label htmlFor="newCouponDescription">{t("categories.descriptionOptional")}</Label>
                      <Textarea
                        id="newCouponDescription"
                        value={newCouponDescription}
                        onChange={(e) => setNewCouponDescription(e.target.value)}
                        placeholder={t("coupons.descriptionPlaceholder")}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponDiscountType">{t("coupons.discountType")}</Label>
                        <Select value={newCouponDiscountType} onValueChange={(value: "percentage" | "fixed") => setNewCouponDiscountType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">{t("coupons.percentage")}</SelectItem>
                            <SelectItem value="fixed">{t("coupons.fixedAmount")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="newCouponDiscountValue">{t("coupons.discountValue")}</Label>
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
                        <Label htmlFor="newCouponApplicableTo">{t("coupons.applicableTo")}</Label>
                        <Select value={newCouponApplicableTo} onValueChange={(value: "all" | "sellers" | "buyers") => setNewCouponApplicableTo(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("sales.filters.payment.all")}</SelectItem>
                            <SelectItem value="sellers">{t("coupons.sellersOnly")}</SelectItem>
                            <SelectItem value="buyers">{t("coupons.buyersOnly")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponMinPurchase">{t("coupons.minPurchaseOptional")}</Label>
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
                        <Label htmlFor="newCouponMaxDiscount">{t("coupons.maxDiscountOptional")}</Label>
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
                      <div>
                        <Label htmlFor="newCouponUsageLimit">{t("coupons.usageLimitOptional")}</Label>
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
                        <Label htmlFor="newCouponStartDate">{t("offerAlerts.startDate")}</Label>
                        <Input
                          id="newCouponStartDate"
                          type="datetime-local"
                          value={newCouponStartDate}
                          onChange={(e) => setNewCouponStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCouponEndDate">{t("offerAlerts.endDateOptional")}</Label>
                        <Input
                          id="newCouponEndDate"
                          type="datetime-local"
                          value={newCouponEndDate}
                          onChange={(e) => setNewCouponEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={addingCoupon}>
                      {addingCoupon ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {t("coupons.createButton")}
                    </Button>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-1 md:p-2">{t("coupons.code")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("coupons.name")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("coupons.discount")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("coupons.usage")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("offerAlerts.dates")}</TableHead>
                          <TableHead className="hidden md:table-cell p-1 md:p-2">{t("common.status")}</TableHead>
                          <TableHead className="p-1 md:p-2">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id} className="text-xs md:text-sm">
                            <TableCell className="p-1 md:p-2 font-mono font-bold max-w-[60px] truncate">{coupon.code}</TableCell>
                            <TableCell className="p-1 md:p-2 max-w-[80px] truncate">
                                <div className="font-medium">{coupon.name}</div>
                              {coupon.description && <div className="text-xs text-gray-500 truncate">{coupon.description}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="font-medium">{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : fmtNum(coupon.discountValue)}</div>
                              {coupon.minPurchase && <div className="text-xs text-gray-500">{t("common.min")}: {fmtNum(coupon.minPurchase)}</div>}
                              {coupon.maxDiscount && <div className="text-xs text-gray-500">{t("common.max")}: {fmtNum(coupon.maxDiscount)}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div>{t("common.uses", { count: coupon.usedCount })}</div>
                              {coupon.usageLimit && <div className="text-xs text-gray-500">{t("common.usesOf", { limit: coupon.usageLimit })}</div>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2 text-xs">
                              <div>{t('common.start')}: {coupon.startDate?.toDate?.()?.toLocaleDateString() || t("common.now")}</div>
                              {coupon.endDate && (
                                <div>{t('common.end')}: {coupon.endDate?.toDate?.()?.toLocaleDateString()}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-1 md:p-2">
                              <div className="flex items-center gap-2">
                                <Switch checked={coupon.isActive} onCheckedChange={() => handleToggleCouponActive(coupon.id, coupon.isActive)} />
                                <Badge variant={coupon.isActive ? "default" : "secondary"}>{coupon.isActive ? t("common.active") : t("common.inactive")}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 md:p-2">
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteCoupon(coupon.id, coupon.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Precios de Suscripción Tab */}
            <TabsContent value="subscriptionPricing" className="mt-4 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-right-3 data-[state=active]:duration-300">
              {currentUser ? (
                <SubscriptionPricingManager currentUserId={currentUser.firebaseUser.uid} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("subscriptionPricingFallback.title")}</CardTitle>
                    <CardDescription>
                      {t("subscriptionPricingFallback.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                      <span className="ml-2">{t("subscriptionPricingFallback.verifying")}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Modal de Marcado Manual de Pagos */}
      <Dialog open={paymentMarkingModal.isOpen} onOpenChange={closePaymentMarkingModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("paymentModal.title")}</DialogTitle>
            <DialogDescription>
              {t("paymentModal.description", { sellerName: paymentMarkingModal.vendedorNombre })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{t("paymentModal.seller")}</Label>
                <p className="text-sm text-gray-600">{paymentMarkingModal.vendedorNombre}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t("paymentModal.amountToPay")}</Label>
                <p className="text-sm font-semibold text-green-600">
                  {fmtNum(paymentMarkingModal.monto)}
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="paymentMethod" className="text-sm font-medium">
                {t("paymentModal.paymentMethod")}
              </Label>
              <Select value={paymentMethod} onValueChange={(value: 'bank_transfer' | 'mercadopago' | 'cash') => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t("paymentModal.methods.bank_transfer")}</SelectItem>
                  <SelectItem value="mercadopago">{t("paymentModal.methods.mercadopago")}</SelectItem>
                  <SelectItem value="cash">{t("paymentModal.methods.cash")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="paymentNotes" className="text-sm font-medium">
                {t("paymentModal.paymentNotes")}
              </Label>
              <Textarea
                id="paymentNotes"
                placeholder={t("paymentModal.notesPlaceholder")}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  {t("paymentModal.warning")}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePaymentMarkingModal}
              disabled={markingPayment === `${paymentMarkingModal.compraId}-${paymentMarkingModal.vendedorId}`}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleMarkPaymentAsPaid}
              disabled={markingPayment === `${paymentMarkingModal.compraId}-${paymentMarkingModal.vendedorId}`}
            >
              {markingPayment === `${paymentMarkingModal.compraId}-${paymentMarkingModal.vendedorId}` ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.processing")}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("common.confirmPayment")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Ventas y Comisiones Tab */}
      {/* Modal de Detalle de Compra */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle>{t("purchaseModal.title")}</DialogTitle>
            <DialogDescription>
              {t("purchaseModal.paymentId")}: {selectedPurchase?.paymentId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t('common.date')}: {selectedPurchase?.createdAt ? (selectedPurchase?.createdAt.toDate ? new Date(selectedPurchase.createdAt.toDate()).toLocaleString() : new Date(selectedPurchase.createdAt).toLocaleString()) : ''}</p>
            <p>{t('common.buyer')}: {selectedPurchase?.buyerId ? usersMap[selectedPurchase.buyerId as string]?.name || selectedPurchase.buyerId : ''}</p>
            <p>{t('common.total')}: {fmtNum(selectedPurchase?.totalAmount || 0)}</p>
            {/* Tabla de productos en el modal */}
            <div>
              <Table className="w-full min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-3 align-middle">{t('common.product')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.quantity')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.price')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.subtotal')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.seller')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.amountToPay')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.status')}</TableHead>
                    <TableHead className="py-2 px-3 align-middle">{t('common.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPurchase?.products?.map((p: any, idx: number) => {
                    const amountToPay = (p.precio || p.price || 0) * (p.quantity || p.cantidad || 1) * 0.92; // 8% comisión
                    const isPaid = p.paidToSeller === true;
                    return (
                      <TableRow key={idx} className="align-middle">
                        <TableCell className="py-2 px-3 align-middle">{p.nombre || p.productName || p.productoNombre || t('common.product')}</TableCell>
                        <TableCell className="py-2 px-3 align-middle">{p.quantity || p.cantidad || 1}</TableCell>
                        <TableCell className="py-2 px-3 align-middle">{fmtNum(p.precio || p.price || 0)}</TableCell>
                        <TableCell className="py-2 px-3 align-middle">{fmtNum((p.precio || p.price || 0) * (p.quantity || p.cantidad || 1))}</TableCell>
                        <TableCell className="py-2 px-3 align-middle">{usersMap[p.vendedorId]?.name || p.vendedorId}</TableCell>
                        <TableCell className="py-2 px-3 align-middle text-green-700 font-semibold">{fmtNum(amountToPay)}</TableCell>
                        <TableCell className="py-2 px-3 align-middle">
                          {isPaid ? (
                            <Badge variant="default">{t("common.paid")}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("common.pending")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3 align-middle">
                          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isPaid}
                              onClick={async () => {
                                if (!selectedPurchase?.id) return;
                                // Actualizar paidToSeller en Firestore
                                const compraRef = doc(db, 'purchases', selectedPurchase.id);
                                const updatedProducts = selectedPurchase.products.map((prod: any, i: number) =>
                                  i === idx ? { ...prod, paidToSeller: true } : prod
                                );
                                // Verificar si todos quedan pagados
                                const allPaid = updatedProducts.every((prod: any) => prod.paidToSeller === true);
                                await updateDoc(compraRef, {
                                  products: updatedProducts,
                                  paidToSellers: allPaid
                                });
                                // Refrescar datos locales
                                setSelectedPurchase({ ...selectedPurchase, products: updatedProducts });
                                fetchAdminData();
                                // Mostrar toast de confirmación
                                toast({
                                  title: t("toasts.paymentMarkedTitle"),
                                  description: t("toasts.paymentMarkedDescription"),
                                });
                              }}
                            >
                              {t("common.markAsPaid")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSeller(p.vendedorId as string)}
                            >
                              {t("common.viewSeller")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Agregar el modal de información del vendedor */}
      <Dialog open={showSellerModal} onOpenChange={setShowSellerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sellerModal.title")}</DialogTitle>
            <DialogDescription>
              {t("sellerModal.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Avatar>
              <AvatarImage src={selectedSellerId ? usersMap[selectedSellerId as string]?.photoURL : undefined} />
              <AvatarFallback>{t("sellerModal.avatarFallback")}</AvatarFallback>
            </Avatar>
            <p><strong>{t('common.name')}:</strong> {selectedSellerId ? usersMap[selectedSellerId as string]?.name : ''}</p>
            <p><strong>{t('common.email')}:</strong> {selectedSellerId ? usersMap[selectedSellerId as string]?.email : ''}</p>
            <p><strong>{t('common.uid')}:</strong> {selectedSellerId}</p>
            <p><strong>{t('common.active')}:</strong> {selectedSellerId ? (usersMap[selectedSellerId as string]?.isActive ? t("common.yes") : t("common.no")) : ''}</p>
            <p><strong>{t('common.subscribed')}:</strong> {selectedSellerId ? ((usersMap[selectedSellerId as string]?.subscription_status === 'active' || usersMap[selectedSellerId as string]?.subscription?.status === 'active' || usersMap[selectedSellerId as string]?.isSubscribed) ? t("common.yes") : t("common.no")) : ''}</p>
            {bankData ? (
              <div className="pt-4 border-t space-y-1">
                <h3 className="font-semibold text-sm">{t('common.bankDetails')}</h3>
                <p><strong>{t('common.bank')}:</strong> {bankData.banco}</p>
                <p><strong>{t('common.alias')}:</strong> {bankData.alias}</p>
                <p><strong>{t('common.cbu')}:</strong> {bankData.cbu}</p>
                <p><strong>{t('common.accountHolder')}:</strong> {bankData.titular}</p>
                <p><strong>{t('common.cuit')}:</strong> {bankData.cuit}</p>
                <p><strong>{t('common.accountType')}:</strong> {bankData.tipoCuenta}</p>
                <p><strong>{t('common.withdrawalPreference')}:</strong> {bankData.preferenciaRetiro}</p>
                <p><strong>{t('common.immediateTax')}:</strong> {bankData.impuestoInmediato}%</p>
                <p><strong>{t('common.tax7Days')}:</strong> {bankData.impuesto7Dias}%</p>
                <p><strong>{t('common.tax30Days')}:</strong> {bankData.impuesto30Dias}%</p>
              </div>
            ) : (
              <p className="text-muted pt-4 border-t">{t("sellerModal.noBankData")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


