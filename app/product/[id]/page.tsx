"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Store,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileText,
  HelpCircle,
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import ServiceDetail from "@/components/services/ServiceDetail"
import { formatPrice, formatPriceNumber } from "@/lib/utils"
import { ShareButtons } from "@/components/ui/share-buttons"
import { ApiService } from "@/lib/services/api"
import { useToast } from "@/hooks/use-toast"
import { getProductThumbnail } from "@/lib/image-utils"
import { ProductBreadcrumbs } from "@/components/product/product-breadcrumbs"
import { ProductGallery } from "@/components/product/product-gallery"
import { ProductDetailSection } from "@/components/product/product-detail-section"
import { HomeProductCard } from "@/components/home/home-product-card"
import { HomeSectionHeader } from "@/components/home/home-section-header"

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
  media?: ProductMedia[]
  imageUrl?: string // For backward compatibility
  isService: boolean
  stock?: number
  sellerId: string
  createdAt: any
  updatedAt?: any
  couponId?: string | null
  couponStartDate?: any | null
  couponEndDate?: any | null
  condition?: 'nuevo' | 'usado' | null;
  freeShipping?: boolean;
  shippingCost?: number;
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface Seller {
  id: string
  name: string
  email: string
}

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: any
}

interface Question {
  id: string
  productId: string
  userId: string
  userName: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: any
  createdAt: any
}

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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem, getItemQuantity } = useCart()
  const { currentUser, authLoading } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState("")
  const [submittingQuestion, setSubmittingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null)
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)

  // Review form state
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)

  // Direct purchase state
  const [buyingNow, setBuyingNow] = useState(false)

  // Hooks
  const { toast } = useToast()

  // Get product media (with backward compatibility)
  const getProductMedia = (product: Product): ProductMedia[] => {
    if (product.media && product.media.length > 0) {
      return product.media
    }
    if (product.imageUrl) {
      return [{ type: "image", url: product.imageUrl, path: "" }]
    }
    return [{ type: "image", url: "/placeholder.svg?height=400&width=400", path: "" }]
  }

  const productMedia = product ? getProductMedia(product) : []

  useEffect(() => {
    if (params.id && !authLoading) {
      fetchProductDetails(params.id as string)
    }
  }, [params.id, currentUser, authLoading])

  // Reset selectedMediaIndex when product changes
  useEffect(() => {
    setSelectedMediaIndex(0)
  }, [product?.id])

  // Ensure selectedMediaIndex is within bounds when productMedia changes
  useEffect(() => {
    if (productMedia.length > 0 && selectedMediaIndex >= productMedia.length) {
      setSelectedMediaIndex(0)
    }
  }, [productMedia, selectedMediaIndex])

  const fetchProductDetails = async (productId: string) => {
    setLoading(true)
    setError(null)
    setAppliedCoupon(null)

    try {
      // Fetch product
      const productDoc = await getDoc(doc(db, "products", productId))
      if (!productDoc.exists()) {
        setError("Producto no encontrado")
        setLoading(false)
        return
      }

      const productData = { id: productDoc.id, ...productDoc.data() } as Product
      setProduct(productData)

      // Fetch coupon details if couponId exists and is valid today
      if (productData.couponId && productData.couponStartDate && productData.couponEndDate) {
        const now = new Date()
        const startDate = productData.couponStartDate.toDate() // Convert Firestore Timestamp to Date
        const endDate = productData.couponEndDate.toDate() // Convert Firestore Timestamp to Date

        if (now >= startDate && now <= endDate) {
          const couponDoc = await getDoc(doc(db, "coupons", productData.couponId))
          if (couponDoc.exists()) {
            const couponData = { id: couponDoc.id, ...couponDoc.data() } as Coupon
            if (couponData.isActive && (couponData.applicableTo === "all" || couponData.applicableTo === "buyers")) {
              setAppliedCoupon(couponData)
            }
          }
        }
      }

      // Save to recently viewed
      if (productData) {
        const MAX_RECENTLY_VIEWED = 12
        let recentlyViewed = JSON.parse(localStorage.getItem("servido-recently-viewed") || "[]")

        recentlyViewed = recentlyViewed.filter((id: string) => id !== productData.id)
        recentlyViewed.unshift(productData.id)

        if (recentlyViewed.length > MAX_RECENTLY_VIEWED) {
          recentlyViewed = recentlyViewed.slice(0, MAX_RECENTLY_VIEWED)
        }
        localStorage.setItem("servido-recently-viewed", JSON.stringify(recentlyViewed))
      }

      // Fetch category
      if (productData.category) {
        const categoryDoc = await getDoc(doc(db, "categories", productData.category))
        if (categoryDoc.exists()) {
          setCategory({ id: categoryDoc.id, ...categoryDoc.data() } as Category)
        }
      }

      // Fetch brand
      if (productData.brand) {
        const brandDoc = await getDoc(doc(db, "brands", productData.brand))
        if (brandDoc.exists()) {
          setBrand({ id: brandDoc.id, ...brandDoc.data() } as Brand)
        }
      }

      // Fetch seller
      const sellerDoc = await getDoc(doc(db, "users", productData.sellerId))
      if (sellerDoc.exists()) {
        setSeller({ id: sellerDoc.id, ...sellerDoc.data() } as Seller)
      }

      // Fetch related products (same category)
      if (productData.category) {
        const relatedQuery = query(collection(db, "products"), where("category", "==", productData.category), limit(6))
        const relatedSnapshot = await getDocs(relatedQuery)
        const related = relatedSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
          .filter((p) => p.id !== productId)
        setRelatedProducts(related)
      }

      // Fetch reviews
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("productId", "==", productId),
        orderBy("createdAt", "desc"),
      )
      const reviewsSnapshot = await getDocs(reviewsQuery)
      setReviews(reviewsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Review))

      // Fetch questions
      const questionsQuery = query(
        collection(db, "questions"),
        where("productId", "==", productId),
        orderBy("createdAt", "desc"),
      )
      const questionsSnapshot = await getDocs(questionsQuery)
      setQuestions(questionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Question))

      // Check if product is favorited by current user
      if (currentUser) {
        const favoriteQuery = query(
          collection(db, "favorites"),
          where("userId", "==", currentUser.firebaseUser.uid),
          where("productId", "==", productId),
          limit(1),
        )
        const favoriteSnapshot = await getDocs(favoriteQuery)
        if (favoriteSnapshot.docs.length > 0) {
          setIsFavorite(true)
          setFavoriteId(favoriteSnapshot.docs[0].id)
        } else {
          setIsFavorite(false)
          setFavoriteId(null)
        }
      } else {
        setIsFavorite(false)
        setFavoriteId(null)
      }
    } catch (err) {
      console.error("Error fetching product details:", err)
      setError("Error al cargar el producto")
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    // Use the first image from media for cart display
    const firstImage = productMedia.find((m) => m.type === "image")

    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      discountedPrice: finalPrice,
      quantity: quantity,
      imageUrl: firstImage?.url || product.imageUrl,
      media: product.media,
      isService: product.isService,
      sellerId: product.sellerId,
      stock: product.stock,
      appliedCoupon: appliedCoupon,
      condition: product.condition,
      freeShipping: product.freeShipping,
      shippingCost: product.shippingCost,
    })

    setQuantity(1)
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return
    if (!product?.isService && product?.stock && newQuantity > product.stock) return
    setQuantity(newQuantity)
  }

  const currentCartQuantity = product ? getItemQuantity(product.id) : 0
  const maxQuantity = product?.isService ? 10 : (product?.stock || 0) - currentCartQuantity

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      alert("Debes iniciar sesión para añadir a favoritos.")
      router.push("/login")
      return
    }
    if (!product) return

    try {
      if (isFavorite && favoriteId) {
        await deleteDoc(doc(db, "favorites", favoriteId))
        setIsFavorite(false)
        setFavoriteId(null)
        setReviewSuccess("Producto eliminado de favoritos.")
      } else {
        const firstImage = productMedia.find((m) => m.type === "image")
        const docRef = await addDoc(collection(db, "favorites"), {
          userId: currentUser.firebaseUser.uid,
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: firstImage?.url || product.imageUrl,
          addedAt: serverTimestamp(),
        })
        setIsFavorite(true)
        setFavoriteId(docRef.id)
        setReviewSuccess("Producto añadido a favoritos.")
      }
    } catch (err) {
      console.error("Error toggling favorite:", err)
      setReviewError("Error al gestionar favoritos.")
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setReviewError("Debes iniciar sesión para enviar una reseña.")
      return
    }
    if (!product) {
      setReviewError("No se puede enviar reseña sin producto.")
      return
    }
    if (reviewRating === 0) {
      setReviewError("Por favor, selecciona una calificación.")
      return
    }
    if (reviewComment.trim().length < 10) {
      setReviewError("El comentario debe tener al menos 10 caracteres.")
      return
    }

    // Verificar si el comentario contiene números de teléfono
    const containsPhoneNumber = (text: string): boolean => {
      const phonePatterns = [
        /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
        /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
        /(\d{7,15})/g,
        /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
      ]
      return phonePatterns.some(pattern => pattern.test(text))
    }

    if (containsPhoneNumber(reviewComment.trim())) {
      setReviewError("No se permiten números de teléfono en los comentarios por seguridad.")
      return
    }

    setSubmittingReview(true)
    setReviewError(null)
    setReviewSuccess(null)

    try {
      const reviewData = {
        productId: product.id,
        userId: currentUser.firebaseUser.uid,
        userName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Usuario Anónimo",
        rating: reviewRating,
        comment: reviewComment,
        createdAt: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, "reviews"), reviewData)
      // Actualizar el estado local inmediatamente para productos y servicios
      setReviews((prev) => [{ id: docRef.id, ...reviewData, createdAt: new Date() } as Review, ...prev])
      setReviewRating(0)
      setReviewComment("")
      setReviewSuccess("Reseña enviada exitosamente. ¡Gracias por tu opinión!")
    } catch (err) {
      console.error("Error submitting review:", err)
      setReviewError("Error al enviar la reseña. Inténtalo de nuevo.")
    } finally {
      setSubmittingReview(false)
    }
  }

  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  const hasUserReviewed = currentUser ? reviews.some((r) => r.userId === currentUser.firebaseUser.uid) : false

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setQuestionError("Debes iniciar sesión para hacer una pregunta.")
      return
    }
    if (!product) {
      setQuestionError("No se puede enviar pregunta sin producto.")
      return
    }
    if (newQuestion.trim().length < 10) {
      setQuestionError("La pregunta debe tener al menos 10 caracteres.")
      return
    }

    // Verificar si la pregunta contiene números de teléfono
    const containsPhoneNumber = (text: string): boolean => {
      const phonePatterns = [
        /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
        /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
        /(\d{7,15})/g,
        /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
      ]
      return phonePatterns.some(pattern => pattern.test(text))
    }

    if (containsPhoneNumber(newQuestion.trim())) {
      setQuestionError("No se permiten números de teléfono en las preguntas por seguridad.")
      return
    }

    setSubmittingQuestion(true)
    setQuestionError(null)
    setQuestionSuccess(null)

    try {
      const questionData = {
        productId: product.id,
        userId: currentUser.firebaseUser.uid,
        userName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Usuario Anónimo",
        question: newQuestion,
        createdAt: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, "questions"), questionData)
      // Actualizar el estado local inmediatamente para productos y servicios
      setQuestions((prev) => [{ id: docRef.id, ...questionData, createdAt: new Date() } as Question, ...prev])
      setNewQuestion("")
      setQuestionSuccess("Pregunta enviada exitosamente. ¡Gracias por tu consulta!")
    } catch (err) {
      console.error("Error submitting question:", err)
      setQuestionError("Error al enviar la pregunta. Inténtalo de nuevo.")
    } finally {
      setSubmittingQuestion(false)
    }
  }

  const handleSubmitAnswer = async (questionId: string) => {
    if (!currentUser) {
      setQuestionError("Debes iniciar sesión para responder.")
      return
    }
    if (!product || currentUser.firebaseUser.uid !== product.sellerId) {
      setQuestionError("Solo el vendedor puede responder preguntas.")
      return
    }
    if (answerText.trim().length < 5) {
      setQuestionError("La respuesta debe tener al menos 5 caracteres.")
      return
    }

    // Verificar si la respuesta contiene números de teléfono
    const containsPhoneNumber = (text: string): boolean => {
      const phonePatterns = [
        /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
        /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
        /(\d{7,15})/g,
        /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
      ]
      return phonePatterns.some(pattern => pattern.test(text))
    }

    if (containsPhoneNumber(answerText.trim())) {
      setQuestionError("No se permiten números de teléfono en las respuestas por seguridad.")
      return
    }

    setSubmittingAnswer(true)
    setQuestionError(null)

    try {
      const questionRef = doc(db, "questions", questionId)
      await updateDoc(questionRef, {
        answer: answerText,
        answeredBy: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Vendedor",
        answeredAt: serverTimestamp(),
      })

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                answer: answerText,
                answeredBy: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email || "Vendedor",
                answeredAt: new Date(),
              }
            : q,
        ),
      )

      setAnswerText("")
      setAnsweringQuestionId(null)
      setQuestionSuccess("Respuesta enviada exitosamente.")
    } catch (err) {
      console.error("Error submitting answer:", err)
      setQuestionError("Error al enviar la respuesta. Inténtalo de nuevo.")
    } finally {
      setSubmittingAnswer(false)
    }
  }

  // const handleContactSeller = async () => {
  //   if (!currentUser) {
  //     alert("Debes iniciar sesión para contactar al vendedor.")
  //     router.push("/login")
  //     return
  //   }
  //   if (!product || !seller) {
  //     setError("No se pudo obtener la información del producto o vendedor.")
  //     return
  //   }

  //   const existingChatQuery = query(
  //     collection(db, "chats"),
  //     where("productId", "==", product.id),
  //     where("buyerId", "==", currentUser.firebaseUser.uid),
  //     where("sellerId", "==", seller.id),
  //     limit(1),
  //   )
  //   const existingChatSnapshot = await getDocs(existingChatQuery)

  //   if (existingChatSnapshot.docs.length > 0) {
  //     const existingChatId = existingChatSnapshot.docs[0].id
  //     router.push(`/chat/${existingChatId}`)
  //   } else {
  //     try {
  //       const firstImage = productMedia.find((m) => m.type === "image")
  //       const newChatData = {
  //         productId: product.id,
  //         buyerId: currentUser.firebaseUser.uid,
  //         sellerId: seller.id,
  //         buyerName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email?.split("@")?.[0] || "Comprador",
  //         sellerName: seller.name || seller.email?.split("@")[0] || "Vendedor",
  //         productName: product.name,
  //         productImageUrl: firstImage?.url || product.imageUrl || null,
  //         lastMessage: "¡Hola! Me interesa este producto.",
  //         lastMessageTimestamp: serverTimestamp(),
  //         createdAt: serverTimestamp(),
  //       }
  //       const docRef = await addDoc(collection(db, "chats"), newChatData)

  //       await addDoc(collection(db, "chats", docRef.id, "messages"), {
  //         senderId: currentUser.firebaseUser.uid,
  //         senderName: currentUser.firebaseUser.displayName || currentUser.firebaseUser.email?.split("@")?.[0] || "Comprador",
  //         text: "¡Hola! Me interesa este producto.",
  //         timestamp: serverTimestamp(),
  //       })

  //       router.push(`/chat/${docRef.id}`)
  //     } catch (err) {
  //       console.error("Error creating chat:", err)
  //       setError("Error al iniciar el chat. Inténtalo de nuevo.")
  //     }
  //   }
  // }

  const handleContactSeller = async () => {
    alert("Funcionalidad de chat temporalmente deshabilitada")
  }

  // Función para manejar la compra directa
  const handleBuyNow = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar la compra",
        variant: "destructive"
      })
      return
    }

    if (!product) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información del producto",
        variant: "destructive"
      })
      return
    }

    if (maxQuantity <= 0) {
      toast({
        title: "Error",
        description: "Producto sin stock disponible",
        variant: "destructive"
      })
      return
    }

    try {
      setBuyingNow(true)

      // Usar el sistema centralizado para compra directa
      const response = await ApiService.createSingleProductPurchase({
        productId: product.id,
        quantity: quantity,
        buyerId: currentUser.firebaseUser.uid,
        buyerEmail: currentUser.firebaseUser.email || '',
        shippingCost: product.shippingCost // <--- AGREGADO
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.init_point) {
        throw new Error("No se recibió el punto de inicio del pago")
      }

      toast({
        title: "✅ Compra creada",
        description: `${product.name} - ${formatPriceNumber(finalPrice * quantity)}`,
        duration: 3000,
      })

      // Redirigir a MercadoPago
      window.location.href = response.data.init_point
    } catch (error) {
      console.error("Error al procesar la compra directa:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la compra",
        variant: "destructive"
      })
    } finally {
      setBuyingNow(false)
    }
  }

  // Function to calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number, coupon: Coupon): number => {
    let discountedPrice = originalPrice
    if (coupon.discountType === "percentage") {
      discountedPrice = originalPrice * (1 - coupon.discountValue / 100)
      if (coupon.maxDiscount && (originalPrice - discountedPrice) > coupon.maxDiscount) {
        discountedPrice = originalPrice - coupon.maxDiscount
      }
    } else if (coupon.discountType === "fixed") {
      discountedPrice = originalPrice - coupon.discountValue
    }
    return Math.max(0, discountedPrice) // Ensure price doesn't go below 0
  }

  const finalPrice = product && appliedCoupon ? calculateDiscountedPrice(product.price, appliedCoupon) : product?.price || 0;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-6 h-6 w-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-3xl bg-gray-200" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-12 w-1/2 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-purple-50/30 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-gray-100">
          <AlertCircle className="mx-auto mb-4 h-14 w-14 text-purple-400" />
          <h1 className="mb-2 text-xl font-bold text-gray-900">Producto no disponible</h1>
          <p className="mb-6 text-gray-600">{error || "No pudimos cargar este producto."}</p>
          <Button asChild className="rounded-full bg-purple-700 hover:bg-purple-800">
            <Link href="/products">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Render condicional para servicios
  if (product.isService) {
    return (
      <ServiceDetail
        service={{
          ...product,
          categoryName: category?.name,
          isFavorite,
          averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
          reviewsCount: reviews.length,
        }}
        breadcrumbs={[
          { name: "Inicio", href: "/" },
          ...(category ? [{ name: category.name, href: `/category/${category.id}` }] : []),
          { name: product.name },
        ]}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onShare={() => navigator.clipboard && navigator.clipboard.writeText(window.location.href)}
        onContactSeller={handleContactSeller}
        reviews={reviews}
        onSubmitReview={(rating, comment) => {
          setReviewRating(rating)
          setReviewComment(comment)
          handleSubmitReview({ preventDefault: () => {} } as any)
        }}
        questions={questions}
        onSubmitQuestion={(question) => {
          setNewQuestion(question)
          handleSubmitQuestion({ preventDefault: () => {} } as any)
        }}
        currentUser={currentUser}
        loading={loading}
        reviewError={reviewError}
        reviewSuccess={reviewSuccess}
        submittingReview={submittingReview}
        questionError={questionError}
        questionSuccess={questionSuccess}
        submittingQuestion={submittingQuestion}
        answeringQuestionId={answeringQuestionId}
        answerText={answerText}
        setAnsweringQuestionId={setAnsweringQuestionId}
        setAnswerText={setAnswerText}
        handleSubmitAnswer={handleSubmitAnswer}
        submittingAnswer={submittingAnswer}
        hasUserReviewed={hasUserReviewed}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 pb-24">
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="mb-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0 rounded-full hover:bg-purple-50 hover:text-purple-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <ProductBreadcrumbs category={category} productName={product.name} />
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery
            media={productMedia}
            productName={product.name}
            selectedIndex={selectedMediaIndex}
            onSelectIndex={setSelectedMediaIndex}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
          />

          <div className="lg:sticky lg:top-36 lg:self-start">
            <div className="space-y-5 rounded-2xl bg-white p-5 shadow-lg shadow-purple-900/5 ring-1 ring-gray-100 sm:p-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {brand && (
                    <Badge className="rounded-full bg-purple-100 text-purple-800 hover:bg-purple-100">
                      {brand.name}
                    </Badge>
                  )}
                  {product.condition && (
                    <Badge
                      className={`rounded-full text-white ${
                        product.condition === "nuevo" ? "bg-emerald-600" : "bg-amber-600"
                      }`}
                    >
                      {product.condition === "nuevo" ? "Nuevo" : "Usado"}
                    </Badge>
                  )}
                  {product.freeShipping && (
                    <Badge className="rounded-full bg-green-600 text-white">Envío gratis</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{product.name}</h1>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < averageRating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {averageRating.toFixed(1)} · {reviews.length} reseñas
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-700 sm:text-4xl">{formatPrice(finalPrice)}</span>
                  {appliedCoupon && finalPrice < product.price && (
                    <>
                      <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                      <Badge className="rounded-full bg-emerald-500 text-white">
                        {appliedCoupon.discountType === "percentage"
                          ? `${appliedCoupon.discountValue}% OFF`
                          : `$${appliedCoupon.discountValue} OFF`}
                      </Badge>
                    </>
                  )}
                </div>
                {!product.freeShipping && product.shippingCost !== undefined && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="h-4 w-4 text-purple-600" />
                    Envío: <span className="font-medium">{formatPrice(product.shippingCost)}</span>
                  </p>
                )}
                {product.stock !== undefined && (
                  <p className="mt-1 text-sm text-gray-500">
                    Stock: <span className="font-medium text-gray-800">{product.stock} unidades</span>
                  </p>
                )}
                {currentCartQuantity > 0 && (
                  <p className="mt-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-800">
                    Ya tenés {currentCartQuantity} en el carrito
                  </p>
                )}
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Cantidad</span>
                  <div className="flex items-center rounded-full bg-gray-50 p-1 ring-1 ring-gray-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-semibold">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= maxQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {maxQuantity > 0 && (
                    <span className="text-xs text-gray-400">Máx. {maxQuantity}</span>
                  )}
                </div>

                <Button
                  onClick={handleAddToCart}
                  size="lg"
                  disabled={maxQuantity <= 0}
                  className="h-12 w-full rounded-full bg-purple-700 text-base font-semibold shadow-lg shadow-purple-200 hover:bg-purple-800"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {maxQuantity <= 0 ? "Sin stock" : "Agregar al carrito"}
                </Button>
              </div>

              {seller && (
                <div className="rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 p-4 ring-1 ring-purple-100">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                        <Store className="h-5 w-5 text-purple-700" />
                      </div>
                      <div>
                        <Link href={`/seller/${seller.id}`} className="font-semibold text-gray-900 hover:text-purple-800">
                          {seller.name}
                        </Link>
                        <p className="text-xs text-gray-500">Vendedor verificado</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/seller/${seller.id}`}>
                        <Button variant="outline" size="sm" className="rounded-full border-purple-200">
                          Ver tienda
                        </Button>
                      </Link>
                      {currentUser?.firebaseUser.uid !== seller.id && (
                        <Button
                          onClick={handleContactSeller}
                          variant="outline"
                          size="sm"
                          className="rounded-full border-purple-200"
                        >
                          <MessageSquare className="mr-1 h-4 w-4" />
                          Contactar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <ShareButtons
                  productName={product.name}
                  productUrl={typeof window !== "undefined" ? window.location.href : ""}
                  productPrice={finalPrice}
                  productImage={productMedia[0]?.url}
                />
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-purple-600" />
                  Compra protegida
                </span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4 text-purple-600" />
                  Devoluciones
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <ProductDetailSection title="Descripción" icon={FileText}>
            <p className="leading-relaxed text-gray-700">
              {product.description || "Este producto no tiene descripción disponible."}
            </p>
          </ProductDetailSection>
          <ProductDetailSection title="Reseñas" icon={Star} count={reviews.length}>
            {reviewError && (
              <Alert variant="destructive" className="mb-4 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{reviewError}</AlertDescription>
              </Alert>
            )}
            {reviewSuccess && (
              <Alert className="mb-4 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{reviewSuccess}</AlertDescription>
              </Alert>
            )}

            {currentUser && !hasUserReviewed && (
              <form onSubmit={handleSubmitReview} className="mb-8 rounded-2xl bg-purple-50/60 p-5 ring-1 ring-purple-100">
                <h3 className="mb-3 font-semibold text-gray-900">Escribí tu reseña</h3>
                <div className="mb-4">
                  <Label htmlFor="rating" className="mb-2 block text-sm font-medium text-gray-700">
                    Calificación
                  </Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-7 w-7 cursor-pointer transition-colors ${
                          star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                        }`}
                        onClick={() => setReviewRating(star)}
                      />
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <Label htmlFor="comment" className="mb-2 block text-sm font-medium text-gray-700">
                    Comentario
                  </Label>
                  <Textarea
                    id="comment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Compartí tu experiencia con el producto..."
                    rows={4}
                    className="rounded-xl border-0 bg-white ring-1 ring-gray-200"
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingReview} className="rounded-full bg-purple-700 hover:bg-purple-800">
                  {submittingReview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    "Enviar reseña"
                  )}
                </Button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-500">Sé el primero en dejar una reseña.</p>
            ) : (
              <div className="space-y-5">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{review.userName}</span>
                      <span className="text-xs text-gray-400">
                        {review.createdAt?.toDate
                          ? review.createdAt.toDate().toLocaleDateString()
                          : "Fecha desconocida"}
                      </span>
                    </div>
                    <p className="leading-relaxed text-gray-700">
                      {(() => {
                        const censorPhoneNumbers = (text: string): string => {
                          const phonePatterns = [
                            /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
                            /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                            /(\d{7,15})/g,
                            /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                          ]
                          let censoredText = text
                          phonePatterns.forEach((pattern) => {
                            censoredText = censoredText.replace(pattern, "***NÚMERO BLOQUEADO***")
                          })
                          return censoredText
                        }
                        return censorPhoneNumbers(review.comment)
                      })()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ProductDetailSection>

          <ProductDetailSection title="Preguntas y respuestas" icon={HelpCircle} count={questions.length}>
            {questionError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{questionError}</AlertDescription>
              </Alert>
            )}
            {questionSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{questionSuccess}</AlertDescription>
              </Alert>
            )}

            {currentUser && currentUser.firebaseUser.uid !== product.sellerId && (
              <form onSubmit={handleSubmitQuestion} className="mb-8 rounded-2xl bg-purple-50/60 p-5 ring-1 ring-purple-100">
                <h3 className="mb-3 font-semibold text-gray-900">Hacé una pregunta</h3>
                <div className="mb-4">
                  <Label htmlFor="question" className="mb-2 block text-sm font-medium text-gray-700">
                    Tu pregunta
                  </Label>
                  <Textarea
                    id="question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="¿Qué te gustaría saber sobre este producto?"
                    rows={3}
                    className="rounded-xl border-0 bg-white ring-1 ring-gray-200"
                    required
                  />
                </div>
                <Button type="submit" disabled={submittingQuestion} className="rounded-full bg-purple-700 hover:bg-purple-800">
                  {submittingQuestion ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    "Enviar Pregunta"
                  )}
                </Button>
              </form>
            )}

            {questions.length === 0 ? (
              <p className="text-gray-600">Sé el primero en hacer una pregunta sobre este producto.</p>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                    <div className="mb-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                          Pregunta
                        </span>
                        <span className="text-sm text-gray-500">{question.userName}</span>
                        <span className="text-xs text-gray-400">
                          {question.createdAt?.toDate
                            ? question.createdAt.toDate().toLocaleDateString()
                            : "Fecha desconocida"}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {(() => {
                          const censorPhoneNumbers = (text: string): string => {
                            const phonePatterns = [
                              /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
                              /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                              /(\d{7,15})/g,
                              /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
                            ]
                            let censoredText = text
                            phonePatterns.forEach(pattern => {
                              censoredText = censoredText.replace(pattern, '***NÚMERO BLOQUEADO***')
                            })
                            return censoredText
                          }
                          return censorPhoneNumbers(question.question)
                        })()}
                      </p>
                    </div>

                    {question.answer ? (
                      <div className="ml-0 rounded-xl bg-purple-50 p-4 ring-1 ring-purple-100 sm:ml-4">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            Respuesta
                          </span>
                          <span className="text-sm text-gray-500">{question.answeredBy}</span>
                          <span className="text-xs text-gray-400">
                            {question.answeredAt?.toDate
                              ? question.answeredAt.toDate().toLocaleDateString()
                              : "Fecha desconocida"}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {(() => {
                            const censorPhoneNumbers = (text: string): string => {
                              const phonePatterns = [
                                /(\+54\s*9?\s*\d{1,2}\s*\d{4}\s*-?\s*\d{4})/g,
                                /(\d{1,4}\s*-?\s*\d{1,4}\s*-?\s*\d{1,4})/g,
                                /(\d{7,15})/g,
                                /(\(\d{1,4}\)\s*\d{1,4}\s*-?\s*\d{1,4})/g
                              ]
                              let censoredText = text
                              phonePatterns.forEach(pattern => {
                                censoredText = censoredText.replace(pattern, '***NÚMERO BLOQUEADO***')
                              })
                              return censoredText
                            }
                            return censorPhoneNumbers(question.answer)
                          })()}
                        </p>
                      </div>
                    ) : currentUser && currentUser.firebaseUser.uid === product.sellerId ? (
                      <div className="ml-4">
                        {answeringQuestionId === question.id ? (
                          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200 sm:ml-4">
                            <Textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Escribí tu respuesta..."
                              rows={2}
                              className="mb-2 rounded-xl border-0 bg-gray-50 ring-1 ring-gray-200"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSubmitAnswer(question.id)}
                                disabled={submittingAnswer}
                                className="rounded-full bg-purple-700 hover:bg-purple-800"
                              >
                                {submittingAnswer ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando...
                                  </>
                                ) : (
                                  "Responder"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAnsweringQuestionId(null)
                                  setAnswerText("")
                                }}
                                className="rounded-full"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAnsweringQuestionId(question.id)}
                            className="ml-0 rounded-full sm:ml-4"
                          >
                            Responder
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="ml-0 text-sm italic text-gray-400 sm:ml-4">
                        Esperando respuesta del vendedor...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ProductDetailSection>

          {relatedProducts.length > 0 && (
            <section>
              <HomeSectionHeader
                title="Productos relacionados"
                subtitle="Otros artículos que te pueden interesar"
                accent="purple"
              />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {relatedProducts.map((relatedProduct) => (
                  <HomeProductCard
                    key={relatedProduct.id}
                    id={relatedProduct.id}
                    name={relatedProduct.name}
                    price={relatedProduct.price}
                    imageUrl={getProductThumbnail(
                      relatedProduct.media,
                      relatedProduct.imageUrl,
                      relatedProduct.name
                    )}
                    media={relatedProduct.media}
                    condition={relatedProduct.condition}
                    freeShipping={relatedProduct.freeShipping}
                    shippingCost={relatedProduct.shippingCost}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
