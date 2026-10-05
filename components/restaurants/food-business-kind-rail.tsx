"use client"

import {
  CookingPot,
  MoreHorizontal,
  ShoppingBasket,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { FOOD_BUSINESS_KINDS, type FoodBusinessKind } from "@/types/restaurant"
import { getFoodBusinessKindLabel } from "@/lib/i18n/restaurant-labels"

const KIND_ICONS: Record<FoodBusinessKind, LucideIcon> = {
  restaurant: UtensilsCrossed,
  casa_de_comidas: CookingPot,
  kiosco: Store,
  supermercado: ShoppingBasket,
  otros: MoreHorizontal,
}

type FoodBusinessKindRailProps = {
  selected: FoodBusinessKind | ""
  onSelect: (kind: FoodBusinessKind | "") => void
}

export function FoodBusinessKindRail({ selected, onSelect }: FoodBusinessKindRailProps) {
  const t = useTranslations("restaurants")

  return (
    <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-start gap-3 px-0.5 sm:gap-4">
        <button
          type="button"
          onClick={() => onSelect("")}
          className="flex w-[4.5rem] flex-col items-center gap-2 sm:w-20"
        >
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition sm:h-16 sm:w-16",
              selected === ""
                ? "bg-servido-950 text-servido-gold shadow-md"
                : "bg-white text-servido-800 ring-1 ring-servido-950/10 hover:bg-servido-50"
            )}
          >
            <UtensilsCrossed className="h-6 w-6" />
          </span>
          <span
            className={cn(
              "text-center text-[11px] font-medium leading-tight sm:text-xs",
              selected === "" ? "text-servido-950" : "text-slate-600"
            )}
          >
            {t("allBusinessKinds")}
          </span>
        </button>

        {FOOD_BUSINESS_KINDS.map((kind) => {
          const Icon = KIND_ICONS[kind]
          const active = selected === kind
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelect(kind)}
              className="flex w-[4.5rem] flex-col items-center gap-2 sm:w-20"
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full transition sm:h-16 sm:w-16",
                  active
                    ? "bg-servido-950 text-servido-gold shadow-md"
                    : "bg-white text-servido-800 ring-1 ring-servido-950/10 hover:bg-servido-50"
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span
                className={cn(
                  "text-center text-[11px] font-medium leading-tight sm:text-xs",
                  active ? "text-servido-950" : "text-slate-600"
                )}
              >
                {getFoodBusinessKindLabel(t, kind)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
