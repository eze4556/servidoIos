export type BotAudience =
  | "guest"
  | "buyer"
  | "seller_store"
  | "seller_restaurant"
  | "cadete"
  | "admin"

export type BotCapabilityId =
  | "ideas"
  | "publish"
  | "publishFromPhoto"
  | "stats"
  | "store"
  | "trending"
  | "chat"
  | "foodMenu"
  | "cadete"
  | "pricing"
  | "title"
  | "promo"
  | "safety"
  | "shipping"
  | "photos"
  | "orders"
  | "earnings"
  | "buy"
  | "foodOrder"
  | "lives"

export type BotCapability = {
  id: BotCapabilityId
  key: string
  promptKey: string
  chipKey?: string
}

const ALL: Record<BotCapabilityId, BotCapability> = {
  ideas: { id: "ideas", key: "capIdeas", promptKey: "qIdeas" },
  publish: { id: "publish", key: "capPublish", promptKey: "qPublish" },
  publishFromPhoto: {
    id: "publishFromPhoto",
    key: "capPublishPhoto",
    promptKey: "qPublishPhoto",
    chipKey: "qPublishPhoto",
  },
  stats: { id: "stats", key: "capStats", promptKey: "qStats" },
  store: { id: "store", key: "capStore", promptKey: "qStore" },
  trending: { id: "trending", key: "capTrending", promptKey: "qTrending" },
  chat: { id: "chat", key: "capChat", promptKey: "qChat" },
  foodMenu: { id: "foodMenu", key: "capFood", promptKey: "qFoodMenu" },
  cadete: { id: "cadete", key: "capCadete", promptKey: "qCadete" },
  pricing: { id: "pricing", key: "capPricing", promptKey: "qPrice", chipKey: "qPrice" },
  title: { id: "title", key: "capTitle", promptKey: "qTitle", chipKey: "qTitle" },
  promo: { id: "promo", key: "capPromo", promptKey: "qPromo", chipKey: "qPromo" },
  safety: { id: "safety", key: "capSafety", promptKey: "qSafety", chipKey: "qSafety" },
  shipping: { id: "shipping", key: "capShipping", promptKey: "qShipping", chipKey: "qShipping" },
  photos: { id: "photos", key: "capPhotos", promptKey: "qPhotos", chipKey: "qPhotos" },
  orders: { id: "orders", key: "capOrders", promptKey: "qOrders", chipKey: "qOrders" },
  earnings: { id: "earnings", key: "capEarnings", promptKey: "qEarnings", chipKey: "qEarnings" },
  buy: { id: "buy", key: "capBuy", promptKey: "qBuy", chipKey: "qBuy" },
  foodOrder: { id: "foodOrder", key: "capFoodOrder", promptKey: "qFoodOrder", chipKey: "qFoodOrder" },
  lives: { id: "lives", key: "capLives", promptKey: "qLives", chipKey: "qLives" },
}

const ROLE_CAPS: Record<BotAudience, BotCapabilityId[]> = {
  guest: ["buy", "store", "cadete", "foodOrder", "safety", "trending", "stats", "ideas"],
  buyer: ["buy", "foodOrder", "ideas", "store", "publish", "cadete", "safety", "chat"],
  seller_store: [
    "publishFromPhoto",
    "publish",
    "ideas",
    "pricing",
    "title",
    "photos",
    "shipping",
    "promo",
    "chat",
    "lives",
    "trending",
    "stats",
  ],
  seller_restaurant: ["foodMenu", "orders", "promo", "pricing", "chat", "photos", "stats", "trending"],
  cadete: ["earnings", "orders", "safety", "chat", "stats", "cadete"],
  admin: ["stats", "trending", "safety", "chat", "ideas"],
}

export function resolveBotAudience(input?: {
  role?: string | null
  businessType?: string | null
  isLoggedIn?: boolean
}): BotAudience {
  if (!input?.isLoggedIn) return "guest"
  if (input.role === "admin") return "admin"
  if (input.role === "cadete") return "cadete"
  if (input.role === "seller") {
    return input.businessType === "restaurant" ? "seller_restaurant" : "seller_store"
  }
  return "buyer"
}

export function getCapabilitiesForAudience(audience: BotAudience): BotCapability[] {
  return ROLE_CAPS[audience].map((id) => ALL[id])
}

export function getChipCapabilities(audience: BotAudience): BotCapability[] {
  return getCapabilitiesForAudience(audience).filter((c) => c.chipKey).slice(0, 4)
}

export function audienceLabel(audience: BotAudience, locale?: string): string {
  const isPt = locale === "pt-BR"
  const map: Record<BotAudience, [string, string]> = {
    guest: ["visitante", "visitante"],
    buyer: ["comprador", "comprador"],
    seller_store: ["vendedor de productos", "vendedor de produtos"],
    seller_restaurant: ["restaurante / comida", "restaurante / comida"],
    cadete: ["cadete / repartidor", "entregador"],
    admin: ["admin", "admin"],
  }
  return isPt ? map[audience][1] : map[audience][0]
}

/** Tools that should NOT be emphasized/used for this audience */
export function disallowedToolHints(audience: BotAudience): string[] {
  switch (audience) {
    case "seller_store":
      return ["draft_restaurant_menu", "food restaurant menu", "cadete delivery pool"]
    case "seller_restaurant":
      return ["draft_product_listing for electronics/clothing", "vehicle listings"]
    case "cadete":
      return ["draft_restaurant_menu", "draft_product_listing", "suggest_pricing for products"]
    case "buyer":
    case "guest":
      return []
    default:
      return []
  }
}

/** Tool names exposed to the model for this audience */
export function getActiveToolsForAudience(audience: BotAudience): string[] {
  const common = [
    "get_platform_stats",
    "get_quick_actions",
    "get_faq_answer",
    "get_safety_tips",
    "create_growth_plan",
    "write_chat_reply",
  ] as const

  switch (audience) {
    case "seller_store":
      return [
        ...common,
        "suggest_business_ideas",
        "get_trending_niches",
        "draft_product_listing",
        "optimize_listing_title",
        "suggest_pricing",
        "write_promo_copy",
        "seller_photo_checklist",
        "seller_shipping_guide",
      ]
    case "seller_restaurant":
      return [
        ...common,
        "draft_restaurant_menu",
        "suggest_pricing",
        "write_promo_copy",
        "restaurant_ops_tips",
        "get_trending_niches",
      ]
    case "cadete":
      return [...common, "cadete_ops_tips", "get_platform_stats"]
    case "admin":
      return [...common, "get_trending_niches", "suggest_business_ideas"]
    case "buyer":
      return [
        ...common,
        "suggest_business_ideas",
        "get_trending_niches",
        "draft_product_listing",
        "write_promo_copy",
      ]
    case "guest":
    default:
      return [
        ...common,
        "suggest_business_ideas",
        "get_trending_niches",
        "draft_product_listing",
        "draft_restaurant_menu",
      ]
  }
}
