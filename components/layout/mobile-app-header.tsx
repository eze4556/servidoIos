"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import {
  Heart,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Search,
  Sparkles,
  Store,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CartDrawer } from "@/components/cart-drawer"
import { useAuth } from "@/contexts/auth-context"
import { useLocation } from "@/contexts/location-context"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { getSearchResultImage } from "@/lib/image-utils"
import { formatPrice } from "@/lib/utils"
import { UserGreeting } from "@/components/layout/user-greeting"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { LocaleFlagToggle } from "@/components/layout/locale-flag-toggle"
import { useTranslations } from "next-intl"

interface SearchProduct {
  id: string
  name: string
  price: number
  imageUrl?: string
  media?: { url: string; type: string }[]
}

interface MobileAppHeaderProps {
  /** En home no mostramos menú hamburguesa */
  showMenu?: boolean
}

function useRoleBadge(pathname: string, role?: string) {
  const tr = useTranslations("roles")
  if (pathname.startsWith("/dashboard/seller")) return tr("seller")
  if (pathname.startsWith("/dashboard/buyer")) return tr("buyer")
  if (pathname.startsWith("/admin")) return tr("admin")
  if (role === "seller" && pathname.startsWith(`/seller/`)) return tr("seller")
  return null
}

export function MobileAppHeader({ showMenu = true }: MobileAppHeaderProps) {
  const t = useTranslations("header")
  const tm = useTranslations("mobileMenu")
  const tc = useTranslations("common")
  const tr = useTranslations("roles")
  const router = useRouter()
  const pathname = usePathname()
  const { currentUser, authLoading, handleLogout, getDashboardLink } = useAuth()
  const { userLocation, shortLocation, loadingLocation, openLocationPicker } = useLocation()

  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
  const [allProducts, setAllProducts] = useState<SearchProduct[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  const roleBadge = useRoleBadge(pathname || "", currentUser?.role)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const updateHeight = () => setHeaderHeight(el.offsetHeight)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [userLocation, loadingLocation, roleBadge, currentUser?.firebaseUser.uid])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest(".mobile-search-container")) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const runSearch = async (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    setIsSearching(true)
    setShowSearchResults(true)

    let products = allProducts
    if (!products) {
      const snapshot = await getDocs(collection(db, "products"))
      products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SearchProduct)
      setAllProducts(products)
    }

    const lower = trimmed.toLowerCase()
    setSearchResults(products.filter((p) => p.name?.toLowerCase().includes(lower)).slice(0, 8))
    setIsSearching(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim()
    if (term) {
      router.push(`/search?q=${encodeURIComponent(term)}`)
      setShowSearchResults(false)
    }
  }

  const locationText = loadingLocation
    ? tc("detecting")
    : shortLocation || userLocation || tc("chooseLocation")

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <div
        ref={headerRef}
        className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700 px-4 pb-3 pt-3 shadow-lg shadow-servido-950/50 lg:hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md ring-2 ring-white/30">
              <Image
                src="/images/logo-128.png"
                alt="Servido"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </span>
            <div className="min-w-0">
              <span className="block text-lg font-bold leading-tight tracking-tight text-white">Servido</span>
              <UserGreeting variant="mobile" className="mt-0.5" />
              {roleBadge && !currentUser && (
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-purple-200/90">
                  {roleBadge}
                </span>
              )}
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-0.5">
            <LocaleFlagToggle variant="dark" className="mr-0.5" />
            <NotificationBell className="h-10 w-10 text-white/90 hover:bg-white/10" />
            <div className="[&_button]:text-white [&_button]:hover:bg-white/10">
              <CartDrawer />
            </div>
            {showMenu && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
                aria-label={tc("openMenu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="mobile-search-container relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              runSearch(e.target.value)
            }}
            placeholder={t("searchPlaceholder")}
            className="h-11 rounded-2xl border-0 bg-white pl-11 pr-4 text-sm shadow-lg placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-servido-gold/50"
          />
          {showSearchResults && query.trim() && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 p-4 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin text-servido-700" />
                  {tc("searching")}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-gray-50 py-1">
                  {searchResults.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50"
                      onClick={() => setShowSearchResults(false)}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        <Image
                          src={getSearchResultImage(product.media, product.imageUrl, product.name)}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm font-semibold text-servido-800">{formatPrice(product.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-center text-sm text-gray-500">{tc("noResults")}</p>
              )}
            </div>
          )}
        </form>

        <button
          type="button"
          className="mt-2.5 flex w-full items-center gap-1.5 text-left text-[11px] leading-snug text-purple-100"
          onClick={openLocationPicker}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-servido-gold" />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold text-purple-200/90">{tc("sendTo")}:</span> {locationText}
          </span>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-purple-100 ring-1 ring-white/15">
            {tc("change")}
          </span>
        </button>
      </div>

      <div aria-hidden className="lg:hidden" style={{ height: headerHeight || 152 }} />

      {showMenu && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="right" className="w-full max-w-sm border-none p-0">
            <div className="bg-gradient-to-br from-servido-950 via-servido-800 to-servido-700 px-5 py-6 text-white">
              <SheetTitle className="text-left text-xl font-bold">{tm("menu")}</SheetTitle>
              <p className="mt-1 text-sm text-purple-200">{tm("explore")}</p>
            </div>

            <div className="space-y-4 overflow-y-auto p-5 pb-8">
              {!authLoading && currentUser ? (
                <div className="flex items-center gap-3 rounded-2xl bg-servido-50 p-3 ring-1 ring-servido-100">
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage src={currentUser.firebaseUser.photoURL || undefined} alt="" />
                    <AvatarFallback className="bg-servido-800 text-white">
                      {currentUser.firebaseUser.displayName?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {currentUser.firebaseUser.displayName || tc("user")}
                    </p>
                    <p className="text-xs capitalize text-servido-700">
                      {currentUser.role === "seller" ? tr("seller") : tr("buyer")}
                    </p>
                  </div>
                </div>
              ) : null}

              <nav className="grid gap-1">
                {[
                  { href: "/", label: tm("home"), icon: Home },
                  { href: "/products", label: tm("products"), icon: Package },
                  { href: "/restaurantes", label: tm("restaurants"), icon: UtensilsCrossed },
                  { href: "/services", label: tm("services"), icon: Sparkles },
                  { href: "/mensajes", label: t("chat"), icon: MessageCircle },
                  { href: "/favorites", label: tm("favorites"), icon: Heart },
                  {
                    href: getDashboardLink(),
                    label: currentUser?.role === "seller" ? tm("sellerPanel") : tm("buyerPanel"),
                    icon: User,
                  },
                  ...(currentUser?.role === "seller"
                    ? [
                        {
                          href: `/seller/${currentUser.firebaseUser.uid}`,
                          label: tm("myStore"),
                          icon: Store,
                        },
                      ]
                    : []),
                  { href: "/acerca-de-nosotros", label: tm("whoWeAre"), icon: Users },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href + label}
                    href={href}
                    onClick={closeMenu}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-servido-50 hover:text-servido-900"
                  >
                    <Icon className="h-4 w-4 text-servido-700" />
                    {label}
                  </Link>
                ))}
              </nav>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    handleLogout()
                    closeMenu()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {tm("logout")}
                </button>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="flex flex-1 items-center justify-center rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
                  >
                    {tm("login")}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={closeMenu}
                    className="flex flex-1 items-center justify-center rounded-full bg-servido-800 py-2.5 text-sm font-semibold text-white"
                  >
                    {tm("register")}
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
