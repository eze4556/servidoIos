import {
  Bike,
  ClipboardList,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Package,
  Percent,
  Search,
  ShoppingBag,
  Store,
  Truck,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { TutorialAudience } from "@/lib/tutorial/storage"

export type TutorialStepKey =
  | "homeExplore"
  | "homeSearch"
  | "homeLocation"
  | "homeStories"
  | "homeCart"
  | "buyerOrders"
  | "buyerClaims"
  | "buyerFavorites"
  | "buyerAppointments"
  | "buyerChat"
  | "buyerReseller"
  | "sellerPublish"
  | "sellerCommission"
  | "sellerMp"
  | "sellerShipping"
  | "sellerClaims"
  | "sellerEarnings"
  | "restaurantMenu"
  | "restaurantOrders"
  | "restaurantCommission"
  | "restaurantDelivery"
  | "cadeteAvailable"
  | "cadeteLocation"
  | "cadeteStatuses"
  | "cadetePay"

export interface TutorialSectionDef {
  id: TutorialAudience
  icon: LucideIcon
  steps: { key: TutorialStepKey; icon: LucideIcon }[]
}

export const TUTORIAL_SECTIONS: TutorialSectionDef[] = [
  {
    id: "home",
    icon: Home,
    steps: [
      { key: "homeExplore", icon: ShoppingBag },
      { key: "homeSearch", icon: Search },
      { key: "homeLocation", icon: MapPin },
      { key: "homeStories", icon: Store },
      { key: "homeCart", icon: Package },
    ],
  },
  {
    id: "buyer",
    icon: ShoppingBag,
    steps: [
      { key: "buyerOrders", icon: ClipboardList },
      { key: "buyerClaims", icon: Package },
      { key: "buyerFavorites", icon: Heart },
      { key: "buyerAppointments", icon: ClipboardList },
      { key: "buyerChat", icon: MessageCircle },
      { key: "buyerReseller", icon: Percent },
    ],
  },
  {
    id: "seller",
    icon: Store,
    steps: [
      { key: "sellerPublish", icon: Package },
      { key: "sellerCommission", icon: Percent },
      { key: "sellerMp", icon: Wallet },
      { key: "sellerShipping", icon: Truck },
      { key: "sellerClaims", icon: ClipboardList },
      { key: "sellerEarnings", icon: Wallet },
    ],
  },
  {
    id: "restaurant",
    icon: UtensilsCrossed,
    steps: [
      { key: "restaurantMenu", icon: UtensilsCrossed },
      { key: "restaurantOrders", icon: ClipboardList },
      { key: "restaurantCommission", icon: Percent },
      { key: "restaurantDelivery", icon: Bike },
    ],
  },
  {
    id: "cadete",
    icon: Bike,
    steps: [
      { key: "cadeteAvailable", icon: Bike },
      { key: "cadeteLocation", icon: MapPin },
      { key: "cadeteStatuses", icon: Truck },
      { key: "cadetePay", icon: Wallet },
    ],
  },
]
