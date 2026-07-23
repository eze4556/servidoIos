"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import {
  Search,
  ChevronDown,
  Menu,
  Heart,
  Package,
  Loader2,
  MapPin,
  MessageCircle,
  UserPlus,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { useLocation } from "@/contexts/location-context"
import { CartDrawer } from "@/components/cart-drawer"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useChatUnread } from "@/components/chat/chat-unread-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { getSearchResultImage } from "@/lib/image-utils"
import { formatPrice } from "@/lib/utils"
import { UserGreeting } from "@/components/layout/user-greeting"

interface CategoryItem {
  id: string
  name: string
  iconQuery?: string
  imageUrl?: string
}

interface SearchProduct {
  id: string
  name: string
  price: number
  imageUrl?: string
  media?: any[]
  category?: string
  sellerName?: string
}

export function Header() {
  const { currentUser, authLoading, handleLogout, getDashboardLink, getVenderLink } = useAuth()
  const { userLocation, shortLocation, loadingLocation, openLocationPicker } = useLocation()
  const { unreadCount } = useChatUnread()
  const router = useRouter()
  const pathname = usePathname()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Estado para almacenar todos los productos
  const [allProducts, setAllProducts] = useState<SearchProduct[] | null>(null)

  // Estado para controlar el menú móvil — ahora en MobileAppHeader

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
        const categorySnapshot = await getDocs(categoriesQuery)
        setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CategoryItem))
      } catch (error) {
        console.error("Error fetching categories for header:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Nueva función para traer todos los productos una sola vez
  const fetchAllProducts = useCallback(async () => {
    try {
      const productsSnapshot = await getDocs(collection(db, "products"));
      const products: SearchProduct[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SearchProduct);
      setAllProducts(products);
    } catch (error) {
      console.error("Error fetching all products for search:", error);
      setAllProducts([]);
    }
  }, [])

  // Modificar handleSearch para filtrar en frontend
  const handleSearch = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 1) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    setIsSearching(true)
    setShowSearchResults(true)

    // Si no se han traído todos los productos, traerlos
    if (!allProducts) {
      await fetchAllProducts();
    }
    // Filtrar en frontend
    const lowerTerm = trimmed.toLowerCase();
    const filtered = (allProducts || []).filter(product => {
      const name = product.name?.toLowerCase() || "";
      const keywords = Array.isArray((product as any).keywords) ? (product as any).keywords.map((k: string) => k.toLowerCase()) : [];
      return name.includes(lowerTerm) || keywords.some((k: string) => k.includes(lowerTerm));
    });
    setSearchResults(filtered.slice(0, 20));
    setIsSearching(false);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    handleSearch(value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setShowSearchResults(false)
    }
  }

  const clearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setShowSearchResults(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchInputClass =
    "w-full rounded-full border-0 bg-gray-100 py-2.5 pl-11 pr-12 text-sm text-gray-900 shadow-inner ring-1 ring-gray-200/80 placeholder:text-gray-500 transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-purple-300 lg:text-base"

  const renderSearchResults = (onResultClick?: () => void) => {
    if (!showSearchResults || !searchTerm.trim()) return null

    return (
      <div
        className={`absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-purple-900/10 max-h-96`}
      >
        {isSearching ? (
          <div className="flex items-center justify-center gap-2 p-4 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            Buscando...
          </div>
        ) : searchResults.length > 0 ? (
          <div className="divide-y divide-gray-50 py-1">
            {searchResults.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-purple-50"
                onClick={() => {
                  setShowSearchResults(false)
                  onResultClick?.()
                }}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-100">
                  <Image
                    src={getSearchResultImage(product.media, product.imageUrl, product.name)}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium text-gray-900">{product.name}</h4>
                  <p className="text-sm font-semibold text-purple-700">{formatPrice(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">No se encontraron productos</div>
        )}
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 hidden lg:block">
      {/* Barra principal — solo desktop */}
      <div className="border-b border-gray-100/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 shadow-md ring-2 ring-servido-100">
                <Image src="/images/logo-128.png" alt="Servido" width={32} height={32} className="h-8 w-8 object-contain" />
              </span>
              <span className="text-xl font-bold tracking-tight text-servido-900 transition-colors group-hover:text-servido-800">
                Servido
              </span>
            </Link>

            <UserGreeting variant="desktop" />

            {/* Centro desktop: categorías + búsqueda */}
            <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 shrink-0 gap-2 rounded-full border-purple-200 bg-purple-50 px-4 font-semibold text-purple-800 shadow-sm hover:border-purple-300 hover:bg-purple-100 hover:text-purple-900"
                  >
                    <Menu className="h-4 w-4" />
                    Categorías
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-2xl border-0 p-2 shadow-xl">
                  {loadingCategories ? (
                    <DropdownMenuItem disabled>Cargando categorías...</DropdownMenuItem>
                  ) : categories.length === 0 ? (
                    <DropdownMenuItem disabled>No hay categorías disponibles.</DropdownMenuItem>
                  ) : (
                    categories.map((category) => (
                      <DropdownMenuItem key={category.id} asChild className="rounded-xl">
                        <Link href={`/category/${category.id}`}>{category.name}</Link>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="search-container relative min-w-0 flex-1 max-w-2xl">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="¿Qué necesitas hoy?"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={searchInputClass}
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-purple-700 text-white transition-colors hover:bg-purple-800"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </form>
                {renderSearchResults()}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {currentUser ? (
                <div className="hidden items-center gap-2 lg:flex">
                  <Avatar className="h-9 w-9 border-2 border-purple-100 ring-2 ring-purple-50">
                    <AvatarImage
                      src={currentUser.firebaseUser.photoURL || undefined}
                      alt={currentUser.firebaseUser.displayName || "Usuario"}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-purple-700 text-sm font-medium text-white">
                      {currentUser.firebaseUser.displayName?.charAt(0).toUpperCase() ||
                        currentUser.firebaseUser.email?.charAt(0).toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden max-w-[10rem] xl:block">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {currentUser.firebaseUser.displayName || currentUser.firebaseUser.email}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Link href="/dashboard/buyer" className="hover:text-purple-700">
                        Mi Panel
                      </Link>
                      {currentUser.role === "seller" && (
                        <Link
                          href={`/seller/${currentUser.firebaseUser.uid}`}
                          className="hover:text-purple-700"
                        >
                          Mi Tienda
                        </Link>
                      )}
                      <button onClick={handleLogout} className="hover:text-purple-700">
                        Salir
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden items-center gap-2 lg:flex">
                  <Link
                    href="/login"
                    className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-purple-800"
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-200 transition-all hover:bg-purple-800 hover:shadow-lg"
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}

              <div className="hidden items-center gap-2 lg:flex">
                <NotificationBell
                  showLabel
                  className={`h-10 px-3 ${
                    pathname?.startsWith("/notifications")
                      ? "bg-servido-800 text-white"
                      : "bg-servido-50 text-servido-900 ring-1 ring-servido-100 hover:bg-servido-100"
                  }`}
                />
                <Link
                  href="/mensajes"
                  className={`relative flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
                    pathname?.startsWith("/mensajes") || pathname?.startsWith("/chat")
                      ? "bg-servido-800 text-white"
                      : "bg-servido-50 text-servido-900 ring-1 ring-servido-100 hover:bg-servido-100"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <CartDrawer />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub navegación */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-r from-servido-950 via-servido-900 to-servido-950" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_0%_50%,rgba(76,29,149,0.28),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_100%_50%,rgba(59,7,100,0.18),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="container relative mx-auto flex items-center justify-between gap-6 px-4 py-2.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openLocationPicker}
                  className="group flex max-w-lg items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left shadow-lg shadow-purple-950/25 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/15 hover:shadow-purple-900/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/10 transition-colors group-hover:bg-white/20">
                    <MapPin className="h-4 w-4 text-purple-100" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-200/90">
                      Enviar a
                    </span>
                    {loadingLocation ? (
                      <span className="flex items-center gap-2 text-sm font-medium text-white">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Detectando...
                      </span>
                    ) : (
                      <span className="block truncate text-sm font-semibold text-white">
                        {shortLocation || userLocation || "Elegí tu ubicación"}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-100 ring-1 ring-white/10">
                    Cambiar
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs rounded-xl border-0 shadow-xl">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Tu ubicación</span>
                  </div>
                  <p className="text-sm">{userLocation || "Todavía no elegiste una ubicación"}</p>
                  <p className="text-xs text-gray-500">Tocá para buscar ciudad o usar el GPS</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <nav className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
            {[
              { href: "/siguiendo", icon: UserPlus, label: "Seguir" },
              { href: "/mensajes", icon: MessageCircle, label: "Chat" },
              { href: "/restaurantes", icon: UtensilsCrossed, label: "Restaurantes" },
              { href: "/services", icon: Package, label: "Servicios" },
              { href: "/favorites", icon: Heart, label: "Favoritos" },
            ].map(({ href, icon: Icon, label }) => {
              const isActive =
                href === "/mensajes"
                  ? pathname?.startsWith("/mensajes") || pathname?.startsWith("/chat")
                  : pathname === href || pathname?.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-white text-purple-900 shadow-md shadow-purple-950/20"
                      : "text-purple-100 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-purple-100 text-purple-700"
                        : "bg-white/10 text-purple-100 group-hover:bg-white/15 group-hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

    </header>
  )
}
