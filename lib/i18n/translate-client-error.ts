/** Maps server/client error messages (often Spanish) to `apiErrors` message keys. */
const MESSAGE_TO_KEY: Record<string, string> = {
  "No autorizado": "unauthorized",
  "Sin sesión": "noSession",
  "No se recibió el punto de inicio del pago": "paymentStartMissing",
  "Error al procesar el pago": "paymentProcessFailed",
  "El vendedor debe conectar su cuenta de Mercado Pago para cobrar": "sellerMpRequired",
  "Compra no encontrada": "purchaseNotFound",
  "No tienes permisos para actualizar este envío": "shippingForbidden",
  "Estado de envío inválido": "shippingInvalidStatus",
  "El pedido no existe.": "foodOrderNotFound",
  "Este pedido no te pertenece.": "foodOrderNotYours",
  "No hay más estados para avanzar.": "foodOrderNoNextStatus",
  "No podés avanzar a ese estado todavía.": "foodOrderStatusBlocked",
  "ID de compra y vendedor requeridos": "shippingPurchaseSellerRequired",
  "El envío ya está inicializado": "shippingAlreadyInitialized",
  "El número de seguimiento debe tener al menos 3 caracteres": "shippingTrackingMin",
  "El nombre del transportista debe tener al menos 2 caracteres": "shippingCarrierMin",
  "Las notas no pueden exceder 500 caracteres": "shippingNotesMax",
  "Solo se pueden actualizar envíos de compras aprobadas": "shippingApprovedOnly",
  "Los servicios no requieren envío físico": "shippingNoPhysical",
  "Error al validar permisos": "shippingValidateFailed",
  "ID de vendedor requerido": "sellerIdRequired",
  "ID de comprador requerido": "buyerIdRequired",
  "El usuario autenticado no coincide con buyerId": "foodBuyerMismatch",
  "Faltan datos del pedido": "foodOrderMissingData",
  "El pedido no tiene items": "foodOrderNoItems",
  "Elegí un método de pago": "foodPickPayment",
  "Restaurante no encontrado": "foodRestaurantNotFound",
  "Dueño del restaurante no encontrado": "foodRestaurantOwnerNotFound",
  "Este restaurante no tiene suscripción activa en Servido": "foodRestaurantNoSubscription",
  "Este restaurante no acepta ese método de pago": "foodPaymentMethodNotAccepted",
  "El restaurante todavía no cargó datos de transferencia": "foodTransferNotConfigured",
  "Cantidad inválida": "foodInvalidQuantity",
  "El combo no pertenece a este restaurante": "foodComboWrongRestaurant",
  "El plato no pertenece a este restaurante": "foodDishWrongRestaurant",
  "Este pedido ya no está disponible.": "foodOrderUnavailable",
  "El pago de este pedido no está aprobado.": "foodOrderPaymentNotApproved",
  "Este pedido es retiro en local.": "foodOrderPickupOnly",
  "Ya fue tomado por otro cadete.": "foodOrderTakenByOtherCadete",
  "Solo podés marcar como entregados los pedidos en camino.": "foodOrderDeliverEnRouteOnly",
  "Ese horario ya no está disponible. Elegí otro turno.": "appointmentSlotTaken",
  "Tenés que iniciar sesión para pedir un turno.": "appointmentLoginRequired",
  "La reserva no existe.": "appointmentNotFound",
  "No tenés permiso para esta reserva.": "appointmentForbidden",
  "Solo podés cancelar tu reserva.": "appointmentCancelOwnOnly",
  "Hay opciones inválidas en el pedido": "menuOptionsInvalid",
  "No se pudo conectar Mercado Pago": "mpConnectFailed",
  "Faltan parámetros de conexión": "mpConnectParamsMissing",
  "Estado de conexión inválido o expirado": "mpConnectStateInvalid",
  "El estado de conexión expiró": "mpConnectStateExpired",
  "Vendedor no encontrado": "sellerNotFound",
}

type ApiErrorTranslate = (key: string, values?: Record<string, string | number>) => string

export function translateClientError(message: string, t: ApiErrorTranslate): string {
  const trimmed = message.trim()
  const key = MESSAGE_TO_KEY[trimmed]
  if (key) return t(key)

  if (trimmed.startsWith("Combo no encontrado:")) return t("foodComboNotFound")
  if (trimmed.startsWith("Plato no encontrado:")) return t("foodDishNotFound")

  const dishUnavailable = /^El plato (.+) no está disponible$/.exec(trimmed)
  if (dishUnavailable) return t("foodDishUnavailable", { name: dishUnavailable[1] })

  const chooseGroup = /^Elegí (.+)$/.exec(trimmed)
  if (chooseGroup) return t("menuChooseGroup", { name: chooseGroup[1] })

  const maxSelect = /^Podés elegir hasta (\d+) en (.+)$/.exec(trimmed)
  if (maxSelect) return t("menuMaxSelect", { max: maxSelect[1], name: maxSelect[2] })

  const invalidOption = /^Opción no válida en (.+)$/.exec(trimmed)
  if (invalidOption) return t("menuInvalidOption", { name: invalidOption[1] })

  const comboUnavailable = /^El combo (.+) no está disponible$/.exec(trimmed)
  if (comboUnavailable) return t("foodComboUnavailable", { name: comboUnavailable[1] })

  const comboEmpty = /^El combo (.+) no tiene productos$/.exec(trimmed)
  if (comboEmpty) return t("foodComboEmpty", { name: comboEmpty[1] })

  return message
}

export function describeApiError(err: unknown, t: ApiErrorTranslate, fallback: string): string {
  if (err instanceof Error) return translateClientError(err.message, t)
  if (typeof err === "string" && err.trim()) return translateClientError(err, t)
  return fallback
}
