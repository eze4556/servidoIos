import fs from "fs"
import path from "path"

const filePath = path.resolve("app/admin/page.tsx")
let src = fs.readFileSync(filePath, "utf8")

if (!src.includes('useTranslations("adminDashboard")')) {
  src = src.replace(
    'import { useRouter } from "next/navigation"',
    'import { useRouter } from "next/navigation"\nimport { useLocale, useTranslations } from "next-intl"'
  )
  src = src.replace(
    'import { formatPrice, formatPriceNumber } from "@/lib/utils"',
    'import { formatPrice, formatPriceNumber } from "@/lib/utils"\nimport { getDateFnsLocale } from "@/lib/i18n/date-locale"\nimport { getCadeteStatusLabel } from "@/lib/i18n/cadete-labels"'
  )
  src = src.replace(
    'import { CADETE_STATUS_LABELS, type CadeteStatus } from "@/types/cadete"',
    'import type { CadeteStatus } from "@/types/cadete"'
  )

  src = src.replace(
    `export default function AdminDashboard() {
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast();`,
    `export default function AdminDashboard() {
  const t = useTranslations("adminDashboard")
  const locale = useLocale()
  const dateLocale = locale === "pt-BR" ? "pt-BR" : "es-AR"
  const dateFnsLocale = getDateFnsLocale(locale)
  const { currentUser, authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast();

  const adminNavItems = useMemo(
    () =>
      [
        { tab: "overview", label: t("nav.overview"), icon: "Home" },
        { tab: "users", label: t("nav.users"), icon: "Users" },
        { tab: "cadetes", label: t("nav.cadetes"), icon: "Bike" },
        { tab: "categories", label: t("nav.categories"), icon: "List" },
        { tab: "brands", label: t("nav.brands"), icon: "Tag" },
        { tab: "allProducts", label: t("nav.allProducts"), icon: "ShoppingCart" },
        { tab: "sales", label: t("nav.sales"), icon: "DollarSign" },
        { tab: "banners", label: t("nav.banners"), icon: "ImageIcon" },
        { tab: "alerts", label: t("nav.alerts"), icon: "Megaphone" },
        { tab: "coupons", label: t("nav.coupons"), icon: "Percent" },
        { tab: "subscriptionPricing", label: t("nav.subscriptionPricing"), icon: "Percent" },
      ] as const,
    [t]
  )

  const navIconMap = {
    Home,
    Users,
    Bike,
    List,
    Tag,
    ShoppingCart,
    DollarSign,
    ImageIcon,
    Megaphone,
    Percent,
  } as const`
  )
}

// Handlers — errors
const errorReplacements = [
  ['setError("Error al cargar los datos del panel. Verifica tu conexión y permisos.")', 'setError(t("errors.loadPanel"))'],
  ["setError('Error al cargar los datos de ventas')", 'setError(t("errors.loadSales"))'],
  ['setError("Error al marcar el pago como realizado")', 'setError(t("errors.markPaymentPaid"))'],
  ['setError("Error al cargar el reporte de comisiones")', 'setError(t("errors.loadCommissionReport"))'],
  ['setError("Error al cargar el historial de pagos manuales")', 'setError(t("errors.loadManualPayments"))'],
  ['setError("Error al cargar las notificaciones")', 'setError(t("errors.loadNotifications"))'],
  ['setError("Error al procesar el pago")', 'setError(t("errors.processPayment"))'],
  ['setError("Error al actualizar el estado de envío")', 'setError(t("errors.updateShipping"))'],
  ['setError("El nombre de la categoría no puede estar vacío.")', 'setError(t("errors.categoryNameEmpty"))'],
  ['setError("Error al añadir la categoría. Revisa la consola para más detalles.")', 'setError(t("errors.addCategory"))'],
  ['setError("El nombre de la marca no puede estar vacío.")', 'setError(t("errors.brandNameEmpty"))'],
  ['setError("Error al añadir la marca. Revisa la consola para más detalles.")', 'setError(t("errors.addBrand"))'],
  ['setError("Error al actualizar el estado del usuario.")', 'setError(t("errors.updateUserStatus"))'],
  ['setError("Error al aprobar el cadete.")', 'setError(t("errors.approveCadete"))'],
  ['setError("Error al rechazar el cadete.")', 'setError(t("errors.rejectCadete"))'],
  ['setError("El título del banner no puede estar vacío.")', 'setError(t("errors.bannerTitleEmpty"))'],
  ['setError("Debes seleccionar una imagen para el banner.")', 'setError(t("errors.bannerImageRequired"))'],
  ['setError("Error al añadir el banner. Revisa la consola para más detalles.")', 'setError(t("errors.addBanner"))'],
  ['setError("Error al actualizar el estado del banner.")', 'setError(t("errors.updateBanner"))'],
  ['setError("El título de la alerta no puede estar vacío.")', 'setError(t("errors.alertTitleEmpty"))'],
  ['setError("El mensaje de la alerta no puede estar vacío.")', 'setError(t("errors.alertMessageEmpty"))'],
  ['setError("Error al añadir la alerta. Revisa la consola para más detalles.")', 'setError(t("errors.addAlert"))'],
  ['setError("Error al actualizar el estado de la alerta.")', 'setError(t("errors.updateAlert"))'],
  ['setError("El código del cupón no puede estar vacío.")', 'setError(t("errors.couponCodeEmpty"))'],
  ['setError("El nombre del cupón no puede estar vacío.")', 'setError(t("errors.couponNameEmpty"))'],
  ['setError("El valor del descuento debe ser mayor a 0.")', 'setError(t("errors.couponDiscountInvalid"))'],
  ['setError("Error al añadir el cupón. Revisa la consola para más detalles.")', 'setError(t("errors.addCoupon"))'],
  ['setError("Error al actualizar el estado del cupón.")', 'setError(t("errors.updateCoupon"))'],
  ['setError("No hay usuarios seleccionados")', 'setError(t("errors.noUsersSelected"))'],
  ['setError("No hay productos seleccionados")', 'setError(t("errors.noProductsSelected"))'],
  ['setError("Error al realizar la acción masiva")', 'setError(t("errors.bulkAction"))'],
]

for (const [from, to] of errorReplacements) {
  src = src.split(from).join(to)
}

src = src.replace(
  /setError\(`Error al eliminar la categoría "\$\{categoryName\}"\.`\)/g,
  'setError(t("errors.deleteCategory", { name: categoryName }))'
)
src = src.replace(
  /setError\(`Error al eliminar la marca "\$\{brandName\}"\.`\)/g,
  'setError(t("errors.deleteBrand", { name: brandName }))'
)
src = src.replace(
  /setError\(`Error al eliminar el producto "\$\{productName\}"\.`\)/g,
  'setError(t("errors.deleteProduct", { name: productName }))'
)
src = src.replace(
  /setError\(`Error al eliminar el banner "\$\{bannerTitle\}"\.`\)/g,
  'setError(t("errors.deleteBanner", { name: bannerTitle }))'
)
src = src.replace(
  /setError\(`Error al eliminar la alerta "\$\{alertTitle\}"\.`\)/g,
  'setError(t("errors.deleteAlert", { name: alertTitle }))'
)
src = src.replace(
  /setError\(`Error al eliminar el cupón "\$\{couponName\}"\.`\)/g,
  'setError(t("errors.deleteCoupon", { name: couponName }))'
)

// confirms
src = src.replace(
  /if \(!window\.confirm\(`¿Estás seguro de que quieres eliminar la categoría "\$\{categoryName\}"\?`\)\)/,
  'if (!window.confirm(t("confirms.deleteCategory", { name: categoryName })))'
)
src = src.replace(
  /if \(!window\.confirm\(`¿Estás seguro de que quieres eliminar la marca "\$\{brandName\}"\?`\)\)/,
  'if (!window.confirm(t("confirms.deleteBrand", { name: brandName })))'
)
src = src.replace(
  /if \(!window\.confirm\(`¿Estás seguro de que quieres eliminar el producto "\$\{productName\}"\?`\)\)/,
  'if (!window.confirm(t("confirms.deleteProduct", { name: productName })))'
)
src = src.replace(
  /if \(!window\.confirm\(`¿Estás seguro de que quieres eliminar el banner "\$\{bannerTitle\}"\?`\)\)/,
  'if (!window.confirm(t("confirms.deleteBanner", { name: bannerTitle })))'
)
src = src.replace(
  /if \(!window\.confirm\(`¿Estás seguro de que quieres eliminar la alerta "\$\{alertTitle\}"\?`\)\)/,
  'if (!window.confirm(t("confirms.deleteAlert", { name: alertTitle })))'
)
src = src.replace(
  /if \(!window\.confirm\(`¿Estás seguro de que quieres eliminar el cupón "\$\{couponName\}"\?`\)\)/,
  'if (!window.confirm(t("confirms.deleteCoupon", { name: couponName })))'
)
src = src.replace(
  /if \(!window\.confirm\(`¿Eliminar \$\{selectedProducts\.length\} productos\? Esta acción no se puede deshacer\.`\)\) return/,
  'if (!window.confirm(t("confirms.bulkDeleteProducts", { count: selectedProducts.length }))) return'
)

src = src.replace(
  `    const confirmMessage = 
      action === 'activate' ? \`¿Activar \${selectedUsers.length} usuarios?\` :
      action === 'deactivate' ? \`¿Desactivar \${selectedUsers.length} usuarios?\` :
      \`¿Eliminar \${selectedUsers.length} usuarios? Esta acción no se puede deshacer.\``,
  `    const confirmMessage =
      action === "activate"
        ? t("confirms.bulkActivateUsers", { count: selectedUsers.length })
        : action === "deactivate"
          ? t("confirms.bulkDeactivateUsers", { count: selectedUsers.length })
          : t("confirms.bulkDeleteUsers", { count: selectedUsers.length })`
)

// upload errors
src = src.replace('throw new Error("Usuario no autenticado.")', 'throw new Error(t("errors.notAuthenticated"))')
src = src.replace('throw new Error("Error al subir la imagen.")', 'throw new Error(t("errors.uploadImage"))')

// toasts in handlers
src = src.replace(
  `      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido.",
        variant: "destructive",
      })`,
  `      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.categoryNameRequired"),
        variant: "destructive",
      })`
)
src = src.replace(
  `      toast({
        title: "Categoría actualizada",
        description: \`La categoría "\${editCategoryName}" ha sido actualizada exitosamente.\`,
      })`,
  `      toast({
        title: t("toasts.categoryUpdatedTitle"),
        description: t("toasts.categoryUpdatedDescription", { name: editCategoryName }),
      })`
)
src = src.replace(
  `      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })`,
  `      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.updateCategoryFailed"),
        variant: "destructive",
      })`
)
src = src.replace(
  `      toast({
        title: "Error",
        description: "El nombre de la marca es requerido.",
        variant: "destructive",
      })`,
  `      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.brandNameRequired"),
        variant: "destructive",
      })`
)
src = src.replace(
  `      toast({
        title: "Marca actualizada",
        description: \`La marca "\${editBrandName}" ha sido actualizada exitosamente.\`,
      })`,
  `      toast({
        title: t("toasts.brandUpdatedTitle"),
        description: t("toasts.brandUpdatedDescription", { name: editBrandName }),
      })`
)
src = src.replace(
  `      toast({
        title: "Error",
        description: "No se pudo actualizar la marca. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })`,
  `      toast({
        title: t("alerts.errorTitle"),
        description: t("errors.updateBrandFailed"),
        variant: "destructive",
      })`
)

// payment notification
src = src.replace(
  "notas: paymentNotes.trim() || 'Pago marcado manualmente por administrador',",
  'notas: paymentNotes.trim() || t("notifications.manualPaymentNote"),'
)
src = src.replace(
  "administradorNombre: currentUser.firebaseUser.displayName || 'Administrador',",
  'administradorNombre: currentUser.firebaseUser.displayName || t("notifications.adminFallback"),'
)
src = src.replace(
  `        title: "Pago Procesado",
        description: \`Se ha procesado tu pago de \${formatPriceNumber(paymentMarkingModal.monto)} por \${paymentMethod === 'bank_transfer' ? 'transferencia bancaria' : paymentMethod === 'mercadopago' ? 'MercadoPago' : 'efectivo'}\`,`,
  `        title: t("toasts.paymentProcessedTitle"),
        description: t("toasts.paymentProcessedDescription", {
          amount: formatPriceNumber(paymentMarkingModal.monto),
          method:
            paymentMethod === "bank_transfer"
              ? t("notifications.paymentMethodBank")
              : paymentMethod === "mercadopago"
                ? t("notifications.paymentMethodMercadoPago")
                : t("notifications.paymentMethodCash"),
        }),`
)
src = src.replace('title: "Actualización de Envío",', 'title: t("toasts.shippingUpdateTitle"),')

src = src.replace("{CADETE_STATUS_LABELS[status] || status}", "{getCadeteStatusLabel(t, status)}")

// Nav sidebars - replace desktop nav array block
const desktopNavOld = `              {[
                { tab: "overview", label: "Resumen", icon: Home },
                { tab: "users", label: "Usuarios", icon: Users },
                { tab: "cadetes", label: "Cadetes", icon: Bike },
                { tab: "categories", label: "Categorías", icon: List },
                { tab: "brands", label: "Marcas", icon: Tag },
                { tab: "allProducts", label: "Todos los Productos", icon: ShoppingCart },
                { tab: "sales", label: "Ventas", icon: DollarSign },
                { tab: "banners", label: "Banners", icon: ImageIcon },
                { tab: "alerts", label: "Alertas", icon: Megaphone },
                { tab: "coupons", label: "Cupones", icon: Percent },
                { tab: "subscriptionPricing", label: "Precios Suscripción", icon: Percent },
              ].map((item) => (`

const desktopNavNew = `              {adminNavItems.map((item) => {
                const NavIcon = navIconMap[item.icon]
                return (`

if (src.includes(desktopNavOld)) {
  src = src.replace(desktopNavOld, desktopNavNew)
  src = src.replace(
    `                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}`,
    `                  <NavIcon className="h-4 w-4" />
                  {item.label}
                </Button>
                )
              })}`
  )
}

const mobileNavOld = `                {[
                  { tab: "overview", label: "Resumen", icon: Home },
                  { tab: "users", label: "Usuarios", icon: Users },
                  { tab: "cadetes", label: "Cadetes", icon: Bike },
                  { tab: "categories", label: "Categorías", icon: List },
                  { tab: "brands", label: "Marcas", icon: Tag },
                  { tab: "allProducts", label: "Todos los Productos", icon: ShoppingCart },
                  { tab: "sales", label: "Ventas", icon: DollarSign },
                  { tab: "banners", label: "Banners", icon: ImageIcon },
                  { tab: "alerts", label: "Alertas", icon: Megaphone },
                  { tab: "coupons", label: "Cupones", icon: Percent },
                ].map((item) => (`

const mobileNavNew = `                {adminNavItems.map((item) => {
                  const NavIcon = navIconMap[item.icon]
                  return (`

if (src.includes(mobileNavOld)) {
  src = src.replace(mobileNavOld, mobileNavNew)
  src = src.replace(
    `                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                ))}`,
    `                    <NavIcon className="h-5 w-5" />
                    {item.label}
                  </Button>
                  )
                })}`
  )
}

// JSX literal replacements (unique strings)
const jsxReplacements = [
  ['<AlertTitle>Acceso Denegado</AlertTitle>', '<AlertTitle>{t("shell.accessDeniedTitle")}</AlertTitle>'],
  [
    `No tienes permisos para acceder a esta página. Por favor,{" "}
            <Link href="/login" className="underline">
              inicia sesión
            </Link>{" "}
            con una cuenta de administrador.`,
    `{t("shell.accessDeniedBeforeLogin")}{" "}
            <Link href="/login" className="underline">
              {t("shell.loginLink")}
            </Link>{" "}
            {t("shell.accessDeniedAfterLogin")}`,
  ],
  ['Cargando panel administrativo...', '{t("shell.loading")}'],
  ['<span className="block text-[10px] uppercase tracking-[0.28em] text-purple-200/70">Servido</span>', '<span className="block text-[10px] uppercase tracking-[0.28em] text-purple-200/70">{t("shell.brand")}</span>'],
  ['<span className="text-lg">Control Center</span>', '<span className="text-lg">{t("shell.controlCenter")}</span>'],
  ['<p className="text-xs uppercase tracking-[0.25em] text-purple-200/70">Session</p>', '<p className="text-xs uppercase tracking-[0.25em] text-purple-200/70">{t("shell.session")}</p>'],
  ['<p className="mt-2 text-sm text-white/80">Panel privilegiado para administración crítica</p>', '<p className="mt-2 text-sm text-white/80">{t("shell.sessionDescription")}</p>'],
  ['<span className="sr-only">Abrir menú</span>', '<span className="sr-only">{t("shell.openMenu")}</span>'],
  ['Panel Administrativo', '{t("shell.pageTitle")}'],
  ['<AlertTitle>Error</AlertTitle>', '<AlertTitle>{t("alerts.errorTitle")}</AlertTitle>'],
  ['<TabsTrigger value="overview">Resumen</TabsTrigger>', '<TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>'],
  ['<TabsTrigger value="users">Usuarios</TabsTrigger>', '<TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>'],
  ['<TabsTrigger value="categories">Categorías</TabsTrigger>', '<TabsTrigger value="categories">{t("tabs.categories")}</TabsTrigger>'],
  ['<TabsTrigger value="brands">Marcas</TabsTrigger>', '<TabsTrigger value="brands">{t("tabs.brands")}</TabsTrigger>'],
  ['<TabsTrigger value="allProducts">Todos los Productos</TabsTrigger>', '<TabsTrigger value="allProducts">{t("tabs.allProducts")}</TabsTrigger>'],
  ['<TabsTrigger value="sales">Ventas y Comisiones</TabsTrigger>', '<TabsTrigger value="sales">{t("tabs.sales")}</TabsTrigger>'],
  ['<TabsTrigger value="banners">Banners</TabsTrigger>', '<TabsTrigger value="banners">{t("tabs.banners")}</TabsTrigger>'],
  ['<TabsTrigger value="alerts">Alertas</TabsTrigger>', '<TabsTrigger value="alerts">{t("tabs.alerts")}</TabsTrigger>'],
  ['<TabsTrigger value="coupons">Cupones</TabsTrigger>', '<TabsTrigger value="coupons">{t("tabs.coupons")}</TabsTrigger>'],
  ['<TabsTrigger value="subscriptionPricing">Precios Suscripción</TabsTrigger>', '<TabsTrigger value="subscriptionPricing">{t("tabs.subscriptionPricing")}</TabsTrigger>'],
]

for (const [from, to] of jsxReplacements) {
  src = src.split(from).join(to)
}

// Date locales in tables
src = src.replace(
  ".toLocaleDateString('es-ES')",
  `.toLocaleDateString(dateLocale)`
)

// Purchase modal toast
src = src.replace(
  `                                toast({
                                  title: 'Pago marcado como realizado',
                                  description: \`El producto ha sido marcado como pagado al vendedor.\`
                                });`,
  `                                toast({
                                  title: t("toasts.paymentMarkedTitle"),
                                  description: t("toasts.paymentMarkedDescription"),
                                });`
)

fs.writeFileSync(filePath, src)
console.log("Patched admin page (phase 1)")
