import type { RestaurantImageValidationCode } from "@/lib/restaurant-storage"

type MenuAdminTranslate = (key: string, values?: Record<string, string | number>) => string

export function imageValidationMessage(
  code: RestaurantImageValidationCode | null,
  t: MenuAdminTranslate
): string | null {
  if (!code) return null
  return t(`imageValidation.${code}`)
}

export function messageFromRestaurantImageUploadError(
  message: string,
  t: MenuAdminTranslate
): string | null {
  const prefix = "restaurant_image:"
  if (!message.startsWith(prefix)) return null
  const code = message.slice(prefix.length) as RestaurantImageValidationCode
  return t(`imageValidation.${code}`)
}
