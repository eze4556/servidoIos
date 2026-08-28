"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ChevronDown,
  Heart,
  Package,
  Loader2,
  MapPin,
  MessageCircle,
  UserPlus,
  UtensilsCrossed,
  Car,
  Building2,
  LayoutGrid,
  LogOut,
  Store,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { LocaleFlagToggle } from "@/components/layout/locale-flag-toggle"
import { cn } from "@/lib/utils"
import { categoryHref, restaurantHref, sellerHref } from "@/lib/routes"

interface CategoryItem {
  id: string
  name: string
  iconQuery?: string
  imageUrl?: string
}

const iconBtn =
  "relative inline-flex h-9 w-9 items-center justify-center rounded-full text-servido-900/75 transition-colors hover:bg-servido-50 hover:text-servido-950"

export function Header() {
  const t = useTranslations("header")
  const tc = useTranslations("common")
  const tb = useTranslations("tabBar")
  const { currentUser, handleLogout, getDashboardLink, getVenderLink } = useAuth()
  const { userLocation, shortLocation, loadingLocation, openLocationPicker } = useLocation()
  const { unreadCount } = useChatUnread()
  const pathname = usePathname()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

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

  const primaryLinks = [
    { href: "/restaurantes", icon: UtensilsCrossed, label: t("navRestaurants") },
    { href: "/autos", icon: Car, label: t("navAutos") },
    { href: "/propiedades", icon: Building2, label: t("navPropiedades") },
    { href: "/services", icon: Package, label: t("navServices") },
  ]

  const secondaryLinks = [
    { href: "/siguiendo", icon: UserPlus, label: t("navFollow") },
    { href: "/favorites", icon: Heart, label: t("navFavorites") },
  ]

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`)

  const storeHref =
    currentUser?.role === "seller"
      ? currentUser.businessType === "restaurant" && currentUser.restaurantId
        ? restaurantHref(currentUser.restaurantId)
        : sellerHref(currentUser.firebaseUser.uid)
      : null

  return (
    <header className="sticky top-0 z-50 hidden lg:block">
      {/* Barra principal */}
      <div className="border-b border-servido-950/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-[4.25rem] max-w-screen-xl items-center gap-5 px-6 xl:px-8">
          {/* Marca */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1 shadow-md ring-1 ring-servido-950/10">
              <Image
                src="/images/logo-128.png"
                alt="Servido"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </span>
            <span className="servido-wordmark text-2xl font-bold tracking-tight">
              Servido
            </span>
          </Link>

          {/* Navegación central — llena el espacio */}
          <nav className="flex min-w-0 flex-1 items-center justify-center gap-0.5 xl:gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-servido-950 transition-colors hover:bg-servido-50"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-servido-800" />
                  {t("categories")}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-[min(70vh,28rem)] w-64 overflow-y-auto rounded-2xl border border-servido-950/5 p-2 shadow-[0_20px_50px_-24px_rgba(46,16,101,0.45)]"
              >
                {loadingCategories ? (
                  <DropdownMenuItem disabled>{tc("loadingCategories")}</DropdownMenuItem>
                ) : categories.length === 0 ? (
                  <DropdownMenuItem disabled>{tc("noCategories")}</DropdownMenuItem>
                ) : (
                  categories.map((category) => (
                    <DropdownMenuItem key={category.id} asChild className="rounded-xl px-3 py-2">
                      <Link href={categoryHref(category.id)}>{category.name}</Link>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="mx-1 hidden h-4 w-px bg-servido-950/10 xl:block" aria-hidden />

            {primaryLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-servido-50 text-servido-950"
                    : "text-servido-900/65 hover:bg-servido-50/80 hover:text-servido-950"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isActive(href) ? "text-servido-800" : "text-servido-900/40 group-hover:text-servido-800"
                  )}
                />
                <span className="hidden xl:inline">{label}</span>
                {isActive(href) && (
                  <span className="absolute inset-x-3 -bottom-[0.85rem] hidden h-0.5 rounded-full bg-servido-gold xl:block" />
                )}
              </Link>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex shrink-0 items-center gap-1">
            <LocaleFlagToggle compact className="mr-0.5" />

            <NotificationBell
              className={cn(
                iconBtn,
                pathname?.startsWith("/notifications") && "bg-servido-50 text-servido-950"
              )}
            />

            <Link
              href="/mensajes"
              className={cn(
                iconBtn,
                (pathname?.startsWith("/mensajes") || pathname?.startsWith("/chat")) &&
                  "bg-servido-50 text-servido-950"
              )}
              aria-label={t("chat")}
            >
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <CartDrawer />

            <span className="mx-1.5 h-5 w-px bg-servido-950/10" aria-hidden />

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-servido-50"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                      <AvatarImage
                        src={currentUser.firebaseUser.photoURL || undefined}
                        alt={currentUser.firebaseUser.displayName || tc("user")}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-servido-800 text-xs font-semibold text-white">
                        {currentUser.firebaseUser.displayName?.charAt(0).toUpperCase() ||
                          currentUser.firebaseUser.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[7.5rem] truncate text-sm font-semibold text-servido-950 2xl:inline">
                      {currentUser.firebaseUser.displayName?.split(/\s+/)[0] ||
                        currentUser.firebaseUser.email?.split("@")[0]}
                    </span>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-servido-900/40 2xl:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 rounded-2xl border border-servido-950/5 p-1.5 shadow-xl"
                >
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href={getDashboardLink()} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("myPanel")}
                    </Link>
                  </DropdownMenuItem>
                  {storeHref && (
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link href={storeHref} className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {t("myStore")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-xl text-red-600 focus:bg-red-50 focus:text-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-servido-900/70 transition-colors hover:bg-servido-50 hover:text-servido-950"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-servido-950 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-servido-800"
                >
                  {t("signup")}
                </Link>
              </div>
            )}

            <Link
              href={getVenderLink()}
              className="ml-1 hidden rounded-full bg-servido-gold px-4 py-2 text-sm font-semibold text-servido-950 shadow-[0_8px_20px_-10px_rgba(255,212,0,0.8)] transition-all hover:bg-[#ffe566] hover:shadow-[0_10px_24px_-10px_rgba(255,212,0,0.95)] xl:inline-flex"
            >
              {tb("sell")}
            </Link>
          </div>
        </div>
      </div>

      {/* Franja de contexto: ubicación + links secundarios */}
      <div className="relative overflow-hidden bg-servido-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_140%_at_0%_50%,rgba(255,212,0,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_120%_at_100%_0%,rgba(167,139,250,0.18),transparent_45%)]" />

        <div className="container relative mx-auto flex h-11 max-w-screen-xl items-center justify-between gap-6 px-6 xl:px-8">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openLocationPicker}
                  className="group flex min-w-0 max-w-md items-center gap-2 text-left transition-opacity hover:opacity-90"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-servido-gold" />
                  <span className="truncate text-[13px] text-white/90">
                    <span className="font-medium text-white/55">{tc("sendTo")} </span>
                    {loadingLocation ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-white">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {tc("detecting")}
                      </span>
                    ) : (
                      <span className="font-semibold text-white">
                        {shortLocation || userLocation || tc("chooseLocation")}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-white/40 transition-transform group-hover:translate-y-px" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs rounded-xl border-0 shadow-xl">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{tc("yourLocation")}</p>
                  <p className="text-sm text-slate-600">{userLocation || tc("noLocationYet")}</p>
                  <p className="text-xs text-slate-400">{tc("locationHint")}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <nav className="flex items-center gap-5">
            {secondaryLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                  isActive(href) ? "text-servido-gold" : "text-white/70 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
