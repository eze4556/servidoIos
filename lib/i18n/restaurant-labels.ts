import type {
  DeliveryMode,
  FoodBusinessKind,
  FoodOrderStatus,
  RestaurantPaymentMethod,
} from "@/types/restaurant"

type LabelTranslate = (key: string) => string

export function getDeliveryModeLabel(t: LabelTranslate, mode: DeliveryMode): string {
  return t(`deliveryMode.${mode}`)
}

export function getFoodBusinessKindLabel(t: LabelTranslate, kind: FoodBusinessKind): string {
  return t(`foodBusinessKind.${kind}`)
}

export function getFoodOrderStatusLabel(t: LabelTranslate, status: FoodOrderStatus): string {
  return t(`status.${status}`)
}

export function getRestaurantPaymentMethodLabel(
  t: LabelTranslate,
  method: RestaurantPaymentMethod
): string {
  return t(`paymentMethod.${method}`)
}
