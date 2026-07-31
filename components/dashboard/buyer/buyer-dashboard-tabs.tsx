"use client"

import type { ChangeEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Heart,
  Loader2,
  MessageSquare,
  Package,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  User,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BuyerDashboardTab } from "@/components/dashboard/buyer/buyer-dashboard-shell"
import { BuyerStatCard } from "@/components/dashboard/buyer/buyer-stat-card"
import { BuyerEmptyState } from "@/components/dashboard/buyer/buyer-empty-state"
import { BuyerPanel } from "@/components/dashboard/buyer/buyer-panel"
import { StatusBadge } from "@/components/dashboard/buyer/buyer-status-badge"
import { BuyerAppointmentsPanel } from "@/components/dashboard/buyer/buyer-appointments-panel"
import type { CentralizedPurchase, PurchaseItem } from "@/types/centralized-payments"
import { getDashboardProductImage } from "@/lib/image-utils"
import { usePriceFormat } from "@/hooks/use-price-format"
import { useTranslations, useLocale } from "next-intl"

interface CompraProductoBuyer {
  compraId: string
  paymentId: string
  fechaCompra: string
  estadoPago: string
  buyerId: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
  vendedorId: string
  vendedorNombre: string
  vendedorEmail: string
  isService: boolean
  shippingStatus?: string
  productImageUrl?: string
}

interface FavoriteProduct {
  id: string
  productId: string
  name: string
  price: number
  imageUrl?: string
  media?: any[]
}

interface BuyerDashboardTabsProps {
  activeTab: BuyerDashboardTab
  loadingData: boolean
  productosComprados: CompraProductoBuyer[]
  centralizedPurchases: CentralizedPurchase[]
  favorites: FavoriteProduct[]
  paginatedPurchases: CompraProductoBuyer[]
  totalPages: number
  page: number
  onPageChange: (page: number) => void
  onTabChange: (tab: BuyerDashboardTab) => void
  onExportExcel: () => void
  onRemoveFavorite: (id: string) => void
  onChatWithSeller: (purchase: CompraProductoBuyer) => void
  onConfirmDelivery: (purchase: CompraProductoBuyer) => void
  onConfirmDeliveryCentralized: (purchaseId: string, item: PurchaseItem) => void
  canConfirmDelivery: (purchase: CompraProductoBuyer) => boolean
  currentUser: {
    displayName?: string | null
    email?: string | null
    photoURL?: string | null
  } | null
  profileImagePreviewUrl: string | null
  profileImageFile: File | null
  uploadingProfileImage: boolean
  profileUpdateError: string | null
  profileUpdateSuccess: string | null
  onProfileImageChange: (e: ChangeEvent<HTMLInputElement>) => void
  onUploadProfileImage: () => void
  onRemoveProfileImage: () => void
  onCancelProfileImageSelection: () => void
  buyerId?: string | null
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
    </div>
  )
}

export function BuyerDashboardTabs({
  activeTab,
  loadingData,
  productosComprados,
  centralizedPurchases,
  favorites,
  paginatedPurchases,
  totalPages,
  page,
  onPageChange,
  onTabChange,
  onExportExcel,
  onRemoveFavorite,
  onChatWithSeller,
  onConfirmDelivery,
  onConfirmDeliveryCentralized,
  canConfirmDelivery,
  currentUser,
  profileImagePreviewUrl,
  profileImageFile,
  uploadingProfileImage,
  profileUpdateError,
  profileUpdateSuccess,
  onProfileImageChange,
  onUploadProfileImage,
  onRemoveProfileImage,
  onCancelProfileImageSelection,
  buyerId,
}: BuyerDashboardTabsProps) {
  const t = useTranslations("buyerDashboard")
  const { formatPriceNumber } = usePriceFormat()
  const tr = useTranslations("reviews")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const formatPurchaseDate = (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
    new Date(date).toLocaleDateString(dateLocale, options)
  const totalSpent =
    productosComprados.filter((p) => p.estadoPago === "pagado").reduce((sum, p) => sum + p.productPrice * p.quantity, 0) +
    centralizedPurchases.reduce((sum, p) => sum + p.total, 0)

  const pendingPayments =
    productosComprados.filter((p) => p.estadoPago === "pendiente").length +
    centralizedPurchases.filter((p) => p.items.some((item) => item.estadoPagoVendedor === "pendiente")).length

  if (activeTab === "appointments") {
    if (!buyerId) return <LoadingBlock />
    return <BuyerAppointmentsPanel buyerId={buyerId} />
  }

  if (activeTab === "dashboard") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BuyerStatCard title={t("statsTotalPurchases")} value={productosComprados.length} icon={ShoppingBag} />
          <BuyerStatCard title={t("statsTotalSpent")} value={formatPriceNumber(totalSpent)} icon={CreditCard} accent="green" />
          <BuyerStatCard title={t("statsFavorites")} value={favorites.length} icon={Heart} accent="rose" />
          <BuyerStatCard title={t("statsPendingPayments")} value={pendingPayments} icon={Clock} accent="amber" />
        </div>

        <BuyerPanel title={t("recentActivity")} description={t("recentActivityDesc")}>
          {loadingData ? (
            <LoadingBlock />
          ) : centralizedPurchases.length === 0 && productosComprados.length === 0 ? (
            <BuyerEmptyState
              title={t("noPurchasesYet")}
              description={t("noPurchasesYetDesc")}
              actionLabel={t("exploreProducts")}
              actionHref="/products"
              icon={<Sparkles className="h-10 w-10" />}
            />
          ) : (
            <div className="space-y-3">
              {centralizedPurchases.slice(0, 2).map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-purple-50 bg-purple-50/30 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                      <ShoppingBag className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {t("purchaseLabel", { id: purchase.id.slice(-8) })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPurchaseDate(purchase.fecha)} · {t("itemsInPurchase", { count: purchase.items.length })}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-purple-900">{formatPriceNumber(purchase.total)}</p>
                </div>
              ))}

              {productosComprados.slice(0, 3).map((purchase, index) => (
                <div
                  key={`${purchase.compraId}-${purchase.productId}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={purchase.productImageUrl || "/placeholder.svg"}
                        alt={purchase.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{purchase.productName}</p>
                      <p className="text-xs text-gray-500">
                        {formatPurchaseDate(purchase.fechaCompra)} · {purchase.vendedorNombre}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={purchase.estadoPago} />
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPriceNumber(purchase.productPrice * purchase.quantity)}
                    </span>
                  </div>
                </div>
              ))}

              {(productosComprados.length > 3 || centralizedPurchases.length > 2) && (
                <Button
                  variant="outline"
                  className="w-full rounded-full border-purple-200 text-purple-900 hover:bg-purple-50"
                  onClick={() => onTabChange("orders")}
                >
                  {t("seeAllOrders")}
                </Button>
              )}
            </div>
          )}
        </BuyerPanel>
      </div>
    )
  }

  if (activeTab === "orders") {
    return (
      <BuyerPanel
        title={t("pages.orders.title")}
        description={t("ordersPanelDesc")}
        action={
          productosComprados.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-purple-200 text-purple-900"
              onClick={onExportExcel}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("exportExcel")}
            </Button>
          ) : undefined
        }
      >
        {loadingData ? (
          <LoadingBlock />
        ) : paginatedPurchases.length === 0 ? (
          <BuyerEmptyState
            title={t("noOrders")}
            description={t("noOrdersDesc")}
            actionLabel={t("goCatalog")}
            actionHref="/products"
            icon={<Package className="h-10 w-10" />}
          />
        ) : (
          <div className="space-y-4">
            {paginatedPurchases.map((purchase, index) => (
              <article
                key={`${purchase.compraId}-${purchase.productId}-${index}`}
                className="overflow-hidden rounded-2xl border border-purple-100/80 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-purple-50 bg-purple-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">
                      {typeof purchase.paymentId === "string"
                        ? t("purchaseLabel", {
                            id: `${purchase.paymentId.slice(0, 6)}…${purchase.paymentId.slice(-4)}`,
                          })
                        : t("purchaseLabel", { id: t("noPaymentId") })}
                    </p>
                    <p className="text-sm text-gray-700">{formatPurchaseDate(purchase.fechaCompra)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={purchase.estadoPago} />
                    {!purchase.isService && (
                      <StatusBadge status={purchase.shippingStatus || "pendiente"} type="shipping" />
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={purchase.productImageUrl || "/placeholder.svg"}
                        alt={purchase.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{purchase.productName}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {purchase.isService ? t("service") : t("product")} · {t("seller")} {purchase.vendedorNombre}
                      </p>
                      <p className="mt-2 text-lg font-bold text-purple-900">{formatPriceNumber(purchase.productPrice)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-purple-200"
                      onClick={() => onChatWithSeller(purchase)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {t("chatWithSeller")}
                    </Button>

                    {canConfirmDelivery(purchase) && (
                      <Button
                        size="sm"
                        className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => onConfirmDelivery(purchase)}
                        disabled={loadingData}
                      >
                        <PackageCheck className="mr-2 h-4 w-4" />
                        {loadingData ? t("confirming") : t("confirmDelivery")}
                      </Button>
                    )}
                  </div>

                  {purchase.shippingStatus === "entregado" && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      {t("deliveryConfirmedShort")}
                    </div>
                  )}
                </div>
              </article>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-gray-500">
                  {t("pageOf", { page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </BuyerPanel>
    )
  }

  if (activeTab === "favorites") {
    return (
      <BuyerPanel title={t("favoritesPanelTitle")} description={t("favoritesPanelDesc")}>
        {loadingData ? (
          <LoadingBlock />
        ) : favorites.length === 0 ? (
          <BuyerEmptyState
            title={t("noFavorites")}
            description={t("noFavoritesDesc")}
            actionLabel={t("exploreProducts")}
            actionHref="/products"
            icon={<Heart className="h-10 w-10" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((product) => (
              <div
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-purple-100/80 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square bg-gray-50">
                  <Image
                    src={getDashboardProductImage(product.media, product.imageUrl)}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 rounded-full bg-white/90 text-rose-500 hover:bg-white hover:text-rose-600"
                    onClick={() => onRemoveFavorite(product.id)}
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </Button>
                </div>
                <div className="p-4">
                  <h3 className="truncate font-medium text-gray-900">{product.name}</h3>
                  <p className="mt-1 text-lg font-bold text-purple-900">{formatPriceNumber(product.price)}</p>
                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 rounded-full border-purple-200">
                      <Link href={`/product/${product.productId}`}>{t("viewProduct")}</Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 rounded-full bg-purple-900 hover:bg-purple-800">
                      <Link href={`/product/${product.productId}`}>{t("buy")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </BuyerPanel>
    )
  }

  if (activeTab === "profile") {
    return (
      <BuyerPanel title={t("pages.profile.title")} description={t("profilePanelDesc")}>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full bg-purple-50 p-1">
            <TabsTrigger value="personal" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-purple-900">
              {t("tabPersonal")}
            </TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-purple-900">
              {t("tabAddresses")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-6 space-y-6">
            <div className="grid gap-4 rounded-2xl border border-purple-50 bg-purple-50/20 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{t("name")}</p>
                <p className="mt-1 font-medium text-gray-900">{currentUser?.displayName || t("notSpecified")}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{t("email")}</p>
                <p className="mt-1 font-medium text-gray-900">{currentUser?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">{t("profilePhoto")}</h3>
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-purple-100 bg-purple-50">
                  {profileImagePreviewUrl ? (
                    <Image src={profileImagePreviewUrl} alt={t("profilePhotoAlt")} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-12 w-12 text-purple-300" />
                    </div>
                  )}
                </div>

                <div className="w-full max-w-md space-y-3">
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={onProfileImageChange}
                    className="cursor-pointer rounded-xl border-purple-100 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-purple-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-purple-900 hover:file:bg-purple-200"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={onUploadProfileImage}
                      disabled={!profileImageFile || uploadingProfileImage}
                      className="rounded-full bg-purple-900 hover:bg-purple-800"
                    >
                      {uploadingProfileImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Subiendo…
                        </>
                      ) : (
                        t("uploadPhoto")
                      )}
                    </Button>
                    {profileImageFile && (
                      <Button variant="outline" size="sm" className="rounded-full" onClick={onCancelProfileImageSelection}>
                        <XCircle className="mr-1 h-4 w-4" />
                        {t("cancel")}
                      </Button>
                    )}
                    {currentUser?.photoURL && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-full"
                        onClick={onRemoveProfileImage}
                        disabled={uploadingProfileImage}
                      >
                        {t("removePhoto")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {profileUpdateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{tr("errorTitle")}</AlertTitle>
                  <AlertDescription>{profileUpdateError}</AlertDescription>
                </Alert>
              )}
              {profileUpdateSuccess && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{tr("successTitle")}</AlertTitle>
                  <AlertDescription>{profileUpdateSuccess}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="addresses" className="mt-6">
            <BuyerEmptyState
              title={t("addressesSoonTitle")}
              description={t("addressesSoonDesc")}
              actionLabel={t("keepShopping")}
              actionHref="/products"
            />
          </TabsContent>
        </Tabs>
      </BuyerPanel>
    )
  }

  if (activeTab === "purchases") {
    return (
      <BuyerPanel title={t("pages.purchases.title")} description={t("purchasesPanelDesc")}>
        {loadingData ? (
          <LoadingBlock />
        ) : productosComprados.length === 0 && centralizedPurchases.length === 0 ? (
          <BuyerEmptyState
            title={t("noTransactions")}
            description={t("noTransactionsDesc")}
            actionLabel={t("exploreProducts")}
            actionHref="/products"
            icon={<CreditCard className="h-10 w-10" />}
          />
        ) : (
          <div className="space-y-4">
            {centralizedPurchases.map((purchase) => (
              <div key={purchase.id} className="overflow-hidden rounded-2xl border border-purple-100/80 bg-white">
                <div className="flex flex-col gap-3 border-b border-purple-50 bg-purple-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                      <ShoppingBag className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{t("purchaseLabel", { id: purchase.id.slice(-8) })}</p>
                      <p className="text-xs text-gray-500">
                        {formatPurchaseDate(purchase.fecha, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-900">{formatPriceNumber(purchase.total)}</span>
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
                      {t("centralized")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  {purchase.items.map((item, index) => (
                    <div
                      key={`${item.productoId}-${index}`}
                      className="flex flex-col gap-3 rounded-xl bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={item.productoImagen || "/placeholder.svg"}
                            alt={item.productoNombre || t("product")}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.productoNombre}</p>
                          <p className="text-xs text-gray-500">{t("seller")} {item.vendedorNombre}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{formatPriceNumber(item.subtotal)}</span>
                        <StatusBadge status={item.estadoEnvio || "pendiente"} type="shipping" />
                        {!item.productoIsService &&
                          item.estadoEnvio === "enviado" &&
                          item.estadoPagoVendedor === "pagado" && (
                            <Button
                              size="sm"
                              className="h-7 rounded-full bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                              onClick={() => onConfirmDeliveryCentralized(purchase.id, item)}
                              disabled={loadingData}
                            >
                              <PackageCheck className="mr-1 h-3 w-3" />
                              {t("delivered")}
                            </Button>
                          )}
                        {item.estadoEnvio === "entregado" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                            <CheckCircle className="h-3 w-3" />
                            {t("delivered")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {productosComprados.map((purchase, index) => (
              <div
                key={`${purchase.compraId}-${purchase.productId}-${index}`}
                className="flex flex-col gap-4 rounded-2xl border border-purple-100/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={purchase.productImageUrl || "/placeholder.svg"}
                      alt={purchase.productName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{purchase.productName}</p>
                    <p className="text-xs text-gray-500">
                      {purchase.isService ? "Servicio" : "Producto"} · {purchase.vendedorNombre}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatPurchaseDate(purchase.fechaCompra, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">{formatPriceNumber(purchase.productPrice)}</span>
                  <StatusBadge status={purchase.estadoPago} />
                </div>
              </div>
            ))}
          </div>
        )}
      </BuyerPanel>
    )
  }

  return null
}
