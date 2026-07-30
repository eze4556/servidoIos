import fs from "fs"
import path from "path"

const filePath = path.resolve("app/admin/page.tsx")
let src = fs.readFileSync(filePath, "utf8")

function rep(from, to) {
  if (!src.includes(from)) return false
  src = src.split(from).join(to)
  return true
}

// handlers
rep(
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

const toastBlocks = [
  [`title: "Error",\n        description: "El nombre de la categoría es requerido."`, `title: t("alerts.errorTitle"),\n        description: t("errors.categoryNameRequired")`],
  [`title: "Categoría actualizada",\n        description: \`La categoría "\${editCategoryName}" ha sido actualizada exitosamente.\``, `title: t("toasts.categoryUpdatedTitle"),\n        description: t("toasts.categoryUpdatedDescription", { name: editCategoryName })`],
  [`title: "Error",\n        description: "No se pudo actualizar la categoría. Por favor, inténtalo de nuevo."`, `title: t("alerts.errorTitle"),\n        description: t("errors.updateCategoryFailed")`],
  [`title: "Error",\n        description: "El nombre de la marca es requerido."`, `title: t("alerts.errorTitle"),\n        description: t("errors.brandNameRequired")`],
  [`title: "Marca actualizada",\n        description: \`La marca "\${editBrandName}" ha sido actualizada exitosamente.\``, `title: t("toasts.brandUpdatedTitle"),\n        description: t("toasts.brandUpdatedDescription", { name: editBrandName })`],
  [`title: "Error",\n        description: "No se pudo actualizar la marca. Por favor, inténtalo de nuevo."`, `title: t("alerts.errorTitle"),\n        description: t("errors.updateBrandFailed")`],
]
for (const [a, b] of toastBlocks) rep(a, b)

const ui = [
  ["Total Usuarios", '{t("overview.totalUsers")}'],
  ["Total Productos", '{t("overview.totalProducts")}'],
  ["Ventas Totales", '{t("overview.totalSales")}'],
  ["Notificaciones", '{t("overview.notifications")}'],
  ["Distribución de Productos por Categoría", '{t("overview.categoryDistributionTitle")}'],
  ["Análisis de la distribución de productos en el marketplace", '{t("overview.categoryDistributionDesc")}'],
  ["Banners Activos", '{t("overview.activeBanners")}'],
  ["Cupones Activos", '{t("overview.activeCoupons")}'],
  ["Top Vendedores", '{t("overview.topSellersTitle")}'],
  ["Vendedores con más ventas en el período actual", '{t("overview.topSellersDesc")}'],
  ["No hay datos de ventas disponibles", '{t("overview.noSalesData")}'],
  ["Gestión de Usuarios", '{t("users.title")}'],
  ["Gestión de Cadetes", '{t("cadetes.title")}'],
  ["Aprobá o rechazá postulaciones. Solo los aprobados pueden tomar pedidos del pool.", '{t("cadetes.description")}'],
  ["Todavía no hay postulaciones de cadetes.", '{t("cadetes.empty")}'],
  ["Gestión de Categorías", '{t("categories.title")}'],
  ["Añadir Nueva Categoría", '{t("categories.addTitle")}'],
  ["Nombre de Categoría", '{t("categories.categoryName")}'],
  ["Descripción (Opcional)", '{t("categories.descriptionOptional")}'],
  ["Breve descripción de la categoría...", '{t("categories.descriptionPlaceholder")}'],
  ["Imagen de Categoría (Opcional)", '{t("categories.imageOptional")}'],
  ["Vista previa de categoría", '{t("categories.previewAlt")}'],
  ["Añadir Categoría", '{t("categories.addButton")}'],
  ["Gestión de Marcas", '{t("brands.title")}'],
  ["Añadir Nueva Marca", '{t("brands.addTitle")}'],
  ["Nombre de Marca", '{t("brands.brandName")}'],
  ["Logo de Marca (Opcional)", '{t("brands.logoOptional")}'],
  ["Vista previa de marca", '{t("brands.previewAlt")}'],
  ["Añadir Marca", '{t("brands.addButton")}'],
  ["Todos los Productos de la Plataforma", '{t("allProducts.title")}'],
  ["Visualiza y gestiona todos los productos y servicios de todos los vendedores.", '{t("allProducts.description")}'],
  ["Nombre o descripción...", '{t("allProducts.searchPlaceholder")}'],
  ["Todas las categorías", '{t("allProducts.allCategories")}'],
  ["Todos los vendedores", '{t("allProducts.allSellers")}'],
  ["Todos los tipos", '{t("allProducts.allTypes")}'],
  ["Orden predeterminado", '{t("allProducts.sortDefaultPlaceholder")}'],
  ["Predeterminado", '{t("allProducts.sortDefault")}'],
  ["Reseñas (Mayor a Menor)", '{t("allProducts.sortReviewsDesc")}'],
  ["Precio (Menor a Mayor)", '{t("allProducts.sortPriceAsc")}'],
  ["Precio (Mayor a Mayor)", '{t("allProducts.sortPriceDesc")}'],
  ["No se encontraron productos que coincidan con los filtros.", '{t("allProducts.empty")}'],
  ["Total Ventas", '{t("sales.totalSales")}'],
  ["Valor bruto de todas las ventas", '{t("sales.grossSalesHint")}'],
  ["Comisiones", '{t("sales.commissions")}'],
  ["8% de comisión total", '{t("sales.commissionRateHint")}'],
  ["Pendiente de Pago", '{t("sales.pendingPayment")}'],
  ["A pagar a vendedores", '{t("sales.pendingToSellersHint")}'],
  ["Ya pagado a vendedores", '{t("sales.paidToSellersHint")}'],
  ["Filtros y Ordenamiento", '{t("sales.filtersTitle")}'],
  ["Estado de Pago", '{t("sales.paymentStatus")}'],
  ["Estado de Envío", '{t("sales.shippingStatus")}'],
  ["Buscar por comprador, producto o ID de compra...", '{t("sales.searchPlaceholder")}'],
  ["Filtros aplicados", '{t("common.filtersApplied")}'],
  ["Gestión de Compras (por compra)", '{t("sales.purchasesTitle")}'],
  ["Administra las compras agrupadas por documento de la colección purchases", '{t("sales.purchasesDesc")}'],
  ["Cargando compras...", '{t("sales.loadingPurchases")}'],
  ["Pago a vendedores", '{t("sales.paymentToSellers")}'],
  ["Pendiente de pago a vendedores", '{t("sales.pendingSellerPayment")}'],
  ["Ver Detalles", '{t("common.viewDetails")}'],
  ["No se encontraron compras", '{t("sales.noPurchases")}'],
  ["No hay compras que coincidan con los filtros aplicados", '{t("sales.noPurchasesFiltered")}'],
  ["Gestión de Banners", '{t("banners.title")}'],
  ["Administra los banners que aparecen en la página principal de la aplicación.", '{t("banners.description")}'],
  ["Añadir Nuevo Banner", '{t("banners.addTitle")}'],
  ["Título del Banner", '{t("banners.bannerTitle")}'],
  ["Orden de Visualización", '{t("banners.displayOrder")}'],
  ["Descripción del banner...", '{t("banners.descriptionPlaceholder")}'],
  ["URL de Enlace (Opcional)", '{t("banners.linkUrlOptional")}'],
  ["https://ejemplo.com", '{t("banners.linkPlaceholder")}'],
  ["Imagen del Banner", '{t("banners.bannerImage")}'],
  ["Vista previa del banner", '{t("banners.previewAlt")}'],
  ["Añadir Banner", '{t("banners.addButton")}'],
  ["Gestión de Alertas de Ofertas", '{t("offerAlerts.title")}'],
  ["Crea y administra alertas que aparecen en la aplicación para informar sobre ofertas especiales.", '{t("offerAlerts.description")}'],
  ["Crear Nueva Alerta", '{t("offerAlerts.addTitle")}'],
  ["Título de la Alerta", '{t("offerAlerts.alertTitle")}'],
  ["Tipo de Alerta", '{t("offerAlerts.alertType")}'],
  ["Mensaje de la alerta...", '{t("offerAlerts.messagePlaceholder")}'],
  ["Fecha de Inicio", '{t("offerAlerts.startDate")}'],
  ["Fecha de Fin (Opcional)", '{t("offerAlerts.endDateOptional")}'],
  ["Crear Alerta", '{t("offerAlerts.createButton")}'],
  ["Información", '{t("offerAlerts.types.info")}'],
  ["Advertencia", '{t("offerAlerts.types.warning")}'],
  ["Éxito", '{t("offerAlerts.types.success")}'],
  ["Gestión de Cupones", '{t("coupons.title")}'],
  ["Crea y administra cupones de descuento que los vendedores pueden utilizar.", '{t("coupons.description")}'],
  ["Crear Nuevo Cupón", '{t("coupons.addTitle")}'],
  ["Código del Cupón", '{t("coupons.code")}'],
  ["DESCUENTO20", '{t("coupons.codePlaceholder")}'],
  ["Nombre del Cupón", '{t("coupons.name")}'],
  ["Descuento del 20%", '{t("coupons.namePlaceholder")}'],
  ["Descripción del cupón...", '{t("coupons.descriptionPlaceholder")}'],
  ["Tipo de Descuento", '{t("coupons.discountType")}'],
  ["Porcentaje (%)", '{t("coupons.percentage")}'],
  ["Monto Fijo ($)", '{t("coupons.fixedAmount")}'],
  ["Valor del Descuento", '{t("coupons.discountValue")}'],
  ["Aplicable a", '{t("coupons.applicableTo")}'],
  ["Solo Vendedores", '{t("coupons.sellersOnly")}'],
  ["Solo Compradores", '{t("coupons.buyersOnly")}'],
  ["Compra Mínima (Opcional)", '{t("coupons.minPurchaseOptional")}'],
  ["Descuento Máximo (Opcional)", '{t("coupons.maxDiscountOptional")}'],
  ["Límite de Uso (Opcional)", '{t("coupons.usageLimitOptional")}'],
  ["Crear Cupón", '{t("coupons.createButton")}'],
  ["Acceso Privilegiado", '{t("subscriptionPricingFallback.title")}'],
  ["Debes estar autenticado para acceder a esta funcionalidad", '{t("subscriptionPricingFallback.description")}'],
  ["Verificando autenticación...", '{t("subscriptionPricingFallback.verifying")}'],
  ["Marcar Pago como Completado", '{t("paymentModal.title")}'],
  ["Confirma el pago manual para el vendedor {paymentMarkingModal.vendedorNombre}", '{t("paymentModal.description", { sellerName: paymentMarkingModal.vendedorNombre })}'],
  ["Método de Pago", '{t("paymentModal.paymentMethod")}'],
  ["Transferencia Bancaria", '{t("paymentModal.methods.bank_transfer")}'],
  ["Notas del Pago", '{t("paymentModal.paymentNotes")}'],
  ["Agregar notas sobre el pago (opcional)", '{t("paymentModal.notesPlaceholder")}'],
  ["Esta acción marcará el pago como completado y enviará una notificación al vendedor.", '{t("paymentModal.warning")}'],
  ["Detalle de Compra", '{t("purchaseModal.title")}'],
  ["Datos del Vendedor", '{t("sellerModal.title")}'],
  ["Información detallada del vendedor seleccionado", '{t("sellerModal.description")}'],
  ["Este vendedor no tiene datos bancarios cargados.", '{t("sellerModal.noBankData")}'],
  ["Subiendo imagen...", '{t("common.uploadingImage")}'],
  ["Quitar Imagen", '{t("common.removeImage")}'],
  ["Guardar Cambios", '{t("common.saveChanges")}'],
  ["Cancelar", '{t("common.cancel")}'],
  ["Eliminar", '{t("common.delete")}'],
  ["Limpiar", '{t("common.clear")}'],
  ["Procesando...", '{t("common.processing")}'],
  ["Confirmar Pago", '{t("common.confirmPayment")}'],
  ["Marcar como pagado", '{t("common.markAsPaid")}'],
  ["Ver Vendedor", '{t("common.viewSeller")}'],
]

// Wrap plain text in JSX carefully - only replace when surrounded by >text<
for (const [es, tr] of ui) {
  rep(`>${es}<`, `>${tr}<`)
}

// Specific JSX patterns
rep("{users.filter(u => u.isActive).length} activos", '{t("overview.activeUsers", { count: users.filter(u => u.isActive).length })}')
rep("{products.filter(p => !p.isService).length} productos, {products.filter(p => p.isService).length} servicios", '{t("overview.productsServicesBreakdown", { products: products.filter(p => !p.isService).length, services: products.filter(p => p.isService).length })}')
rep("{formatPriceNumber(salesSummary.totalComisiones)} en comisiones", '{t("overview.commissionsAmount", { amount: formatPriceNumber(salesSummary.totalComisiones) })}')
rep("{notifications.length} total", '{t("overview.totalCount", { count: notifications.length })}')
rep("de {banners.length} total", '{t("common.ofTotal", { total: banners.length })}')
rep("{coupons.reduce((total, coupon) => total + coupon.usedCount, 0)} usos totales", '{t("overview.totalCouponUses", { count: coupons.reduce((total, coupon) => total + coupon.usedCount, 0) })}')
rep("{formatPriceNumber(vendedor.totalVentas)} en ventas", '{t("overview.salesAmount", { amount: formatPriceNumber(vendedor.totalVentas) })}')
rep('>comisiones<', '>{t("overview.commissionsLabel")}<')
rep("{selectedUsers.length} usuario(s) seleccionado(s)", '{t("users.selectedCount", { count: selectedUsers.length })}')
rep('{user.isActive ? "Activo" : "Inactivo"}', '{user.isActive ? t("common.active") : t("common.inactive")}')
rep('{user.isActive ? "Desactivar" : "Activar"}', '{user.isActive ? t("common.deactivate") : t("common.activate")}')
rep("{pending.length} cadete(s) pendiente(s) de revisión", '{t("cadetes.pendingBanner", { count: pending.length })}')
rep('product.seller?.name || "Vendedor"', 'product.seller?.name || t("common.sellerFallback")')
rep('{product.isService ? "Servicio" : "Producto"}', '{product.isService ? t("common.service") : t("common.product")}')
rep('>Eliminar<', '>{t("common.delete")}<')
rep('<Badge variant="default">Pagado</Badge>', '<Badge variant="default">{t("common.paid")}</Badge>')
rep('<Badge variant="secondary">Pendiente</Badge>', '<Badge variant="secondary">{t("common.pending")}</Badge>')
rep('{banner.isActive ? "Activo" : "Inactivo"}', '{banner.isActive ? t("common.active") : t("common.inactive")}')
rep('{alert.isActive ? "Activa" : "Inactiva"}', '{alert.isActive ? t("common.activeF") : t("common.inactiveF")}')
rep('{coupon.isActive ? "Activo" : "Inactivo"}', '{coupon.isActive ? t("common.active") : t("common.inactive")}')
rep('{alert.type === "info" && "Info"}', '{alert.type === "info" && t("offerAlerts.types.infoShort")}')
rep('{alert.type === "warning" && "Advertencia"}', '{alert.type === "warning" && t("offerAlerts.types.warning")}')
rep('{alert.type === "success" && "Éxito"}', '{alert.type === "success" && t("offerAlerts.types.success")}')
rep('{alert.type === "error" && "Error"}', '{alert.type === "error" && t("alerts.errorTitle")}')
rep('|| "Ahora"', '|| t("common.now")')
rep(">Inicio:", ">{t('common.start')}:")
rep(">Fin:", ">{t('common.end')}:")
rep("<span>Mostrando {filteredPurchases.length} de {purchases.length} compras</span>", '<span>{t("sales.showingPurchases", { filtered: filteredPurchases.length, total: purchases.length })}</span>')

// Sales filter select items - use t for labels, keep values
const paymentFilterLabels = ["all", "pendiente", "pagado", "cancelado"]
for (const v of paymentFilterLabels) {
  rep(`<SelectItem value="${v}">`, `<SelectItem value="${v}">`) // noop
}
rep('<SelectItem value="all">Todos</SelectItem>', '<SelectItem value="all">{t("sales.filters.payment.all")}</SelectItem>')
rep('<SelectItem value="pendiente">Pendiente</SelectItem>', '<SelectItem value="pendiente">{t("sales.filters.payment.pendiente")}</SelectItem>')
rep('<SelectItem value="pagado">Pagado</SelectItem>', '<SelectItem value="pagado">{t("sales.filters.payment.pagado")}</SelectItem>')
rep('<SelectItem value="cancelado">Cancelado</SelectItem>', '<SelectItem value="cancelado">{t("sales.filters.payment.cancelado")}</SelectItem>')
rep('<SelectItem value="en_preparacion">En Preparación</SelectItem>', '<SelectItem value="en_preparacion">{t("sales.filters.shipping.en_preparacion")}</SelectItem>')
rep('<SelectItem value="enviado">Enviado</SelectItem>', '<SelectItem value="enviado">{t("sales.filters.shipping.enviado")}</SelectItem>')
rep('<SelectItem value="entregado">Entregado</SelectItem>', '<SelectItem value="entregado">{t("sales.filters.shipping.entregado")}</SelectItem>')
rep('<SelectItem value="all">Todos</SelectItem>', '<SelectItem value="all">{t("common.all")}</SelectItem>')
rep('<SelectItem value="product">Productos</SelectItem>', '<SelectItem value="product">{t("common.product")}s</SelectItem>')
rep('<SelectItem value="service">Servicios</SelectItem>', '<SelectItem value="service">{t("common.service")}s</SelectItem>')

// seller modal fields
rep("<strong>Nombre:</strong>", "<strong>{t('common.name')}:</strong>")
rep("<strong>Email:</strong>", "<strong>{t('common.email')}:</strong>")
rep("<strong>UID:</strong>", "<strong>{t('common.uid')}:</strong>")
rep("<strong>Activo:</strong>", "<strong>{t('common.active')}:</strong>")
rep("<strong>Suscrito:</strong>", "<strong>{t('common.subscribed')}:</strong>")
rep("? 'Sí' : 'No'", `? t("common.yes") : t("common.no")`)
rep("<h3 className=\"font-semibold text-sm\">Datos Bancarios</h3>", "<h3 className=\"font-semibold text-sm\">{t('common.bankDetails')}</h3>")
rep("<strong>Banco:</strong>", "<strong>{t('common.bank')}:</strong>")
rep("<strong>Alias:</strong>", "<strong>{t('common.alias')}:</strong>")
rep("<strong>CBU:</strong>", "<strong>{t('common.cbu')}:</strong>")
rep("<strong>Titular:</strong>", "<strong>{t('common.accountHolder')}:</strong>")
rep("<strong>CUIT:</strong>", "<strong>{t('common.cuit')}:</strong>")
rep("<strong>Tipo de Cuenta:</strong>", "<strong>{t('common.accountType')}:</strong>")
rep("<strong>Preferencia de Retiro:</strong>", "<strong>{t('common.withdrawalPreference')}:</strong>")
rep("<strong>Impuesto Inmediato:</strong>", "<strong>{t('common.immediateTax')}:</strong>")
rep("<strong>Impuesto 7 días:</strong>", "<strong>{t('common.tax7Days')}:</strong>")
rep("<strong>Impuesto 30 días:</strong>", "<strong>{t('common.tax30Days')}:</strong>")

// purchase modal
rep("<DialogDescription>\n              ID Pago: {selectedPurchase?.paymentId}", "<DialogDescription>\n              {t('purchaseModal.paymentId')}: {selectedPurchase?.paymentId}")
rep("<p>Fecha:", "<p>{t('common.date')}:")
rep("<p>Comprador:", "<p>{t('common.buyer')}:")
rep("<p>Total:", "<p>{t('common.total')}:")
rep("'Producto'", "t('common.product')")
rep("<TableHead className=\"py-2 px-3 align-middle\">Producto</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.product')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Cantidad</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.quantity')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Precio</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.price')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Subtotal</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.subtotal')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Vendedor</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.seller')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Monto a Pagar</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.amountToPay')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Estado</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.status')}</TableHead>")
rep("<TableHead className=\"py-2 px-3 align-middle\">Acción</TableHead>", "<TableHead className=\"py-2 px-3 align-middle\">{t('common.action')}</TableHead>")

// edit category/brand titles
rep("Editar Categoría: {editingCategory.name}", '{t("categories.editTitle", { name: editingCategory.name })}')
rep("Editar Marca: {editingBrand.name}", '{t("brands.editTitle", { name: editingBrand.name })}')

// cadete approve buttons - specific
rep("<CheckCircle className=\"mr-1 h-3.5 w-3.5\" />\n                                              Aprobar", "<CheckCircle className=\"mr-1 h-3.5 w-3.5\" />\n                                              {t(\"common.approve\")}")
rep("<XCircle className=\"mr-1 h-3.5 w-3.5\" />\n                                              Rechazar", "<XCircle className=\"mr-1 h-3.5 w-3.5\" />\n                                              {t(\"common.reject\")}")

fs.writeFileSync(filePath, src)
console.log("phase 2 complete")
