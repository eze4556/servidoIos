"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Plus } from "lucide-react"
import type { FoodOrderItemSelection, MenuItem, MenuPromotion } from "@/types/restaurant"
import { getMenuItemImages, menuItemHasOptions } from "@/types/restaurant"
import {
  getDefaultSelectionInputs,
  getMenuItemFromPrice,
  resolveComboPromotion,
  resolveMenuItemSelections,
  sortOptionGroups,
  type SelectionInput,
} from "@/lib/restaurant-options"
import { formatPriceNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

export type ConfiguredCartAdd = {
  menuItemId: string
  name: string
  price: number
  selections?: FoodOrderItemSelection[]
  promotionId?: string
  subtitle?: string
  lineId: string
}

interface MenuItemDetailDialogProps {
  item: MenuItem | null
  promotion?: MenuPromotion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canOrder: boolean
  onAdd: (configured: ConfiguredCartAdd) => void
}

export function MenuItemDetailDialog({
  item,
  promotion = null,
  open,
  onOpenChange,
  canOrder,
  onAdd,
}: MenuItemDetailDialogProps) {
  const images = item ? getMenuItemImages(item) : []
  const [activeIndex, setActiveIndex] = useState(0)
  const [selections, setSelections] = useState<SelectionInput[]>([])
  const [error, setError] = useState<string | null>(null)

  const groups = useMemo(() => (item ? sortOptionGroups(item.optionGroups) : []), [item])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    setError(null)
    if (item && !promotion) {
      setSelections(getDefaultSelectionInputs(item))
    } else {
      setSelections([])
    }
  }, [open, item?.id, promotion?.id])

  const livePrice = useMemo(() => {
    if (promotion) {
      try {
        return resolveComboPromotion(promotion).unitPrice
      } catch {
        return Number(promotion.comboPrice) || 0
      }
    }
    if (!item) return 0
    try {
      return resolveMenuItemSelections(item, selections).unitPrice
    } catch {
      return getMenuItemFromPrice(item)
    }
  }, [item, promotion, selections])

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    setSelections((prev) => {
      const groupSelected = prev.filter((s) => s.groupId === groupId)
      const already = groupSelected.some((s) => s.optionId === optionId)
      if (maxSelect <= 1) {
        const others = prev.filter((s) => s.groupId !== groupId)
        return already ? others : [...others, { groupId, optionId }]
      }
      if (already) {
        return prev.filter((s) => !(s.groupId === groupId && s.optionId === optionId))
      }
      if (groupSelected.length >= maxSelect) return prev
      return [...prev, { groupId, optionId }]
    })
    setError(null)
  }

  const handleAdd = () => {
    try {
      if (promotion) {
        const resolved = resolveComboPromotion(promotion)
        onAdd({
          menuItemId: `promo_${promotion.id}`,
          name: resolved.displayName,
          price: resolved.unitPrice,
          promotionId: promotion.id,
          subtitle: resolved.includedSummary,
          lineId: resolved.lineKey,
        })
        onOpenChange(false)
        return
      }
      if (!item) return
      const resolved = resolveMenuItemSelections(item, selections)
      onAdd({
        menuItemId: item.id,
        name: resolved.displayName,
        price: resolved.unitPrice,
        selections: resolved.selections,
        lineId: resolved.lineKey,
        subtitle: resolved.selections.map((s) => s.optionName).join(" · ") || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisá las opciones")
    }
  }

  if (!item && !promotion) return null

  const title = promotion?.name || item?.name || ""
  const description = promotion?.description || item?.description
  const current = images[activeIndex] || images[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto rounded-2xl p-0">
        {!promotion && current ? (
          <div className="relative aspect-[4/3] w-full bg-gray-100">
            <Image src={current} alt={title} fill className="object-cover" unoptimized />
          </div>
        ) : !promotion ? (
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-orange-100 to-red-100 text-sm text-orange-800">
            Sin imagen
          </div>
        ) : promotion?.imageUrl ? (
          <div className="relative aspect-[4/3] w-full bg-gray-100">
            <Image
              src={promotion.imageUrl}
              alt={title}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-12 text-white">
              <p className="text-sm font-medium uppercase tracking-wide text-orange-100">Combo</p>
              <p className="mt-1 text-2xl font-bold">{title}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-500 to-red-600 px-4 py-8 text-white">
            <p className="text-sm font-medium uppercase tracking-wide text-orange-100">Combo</p>
            <p className="mt-1 text-2xl font-bold">{title}</p>
          </div>
        )}

        {!promotion && images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3">
            {images.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ${
                  index === activeIndex ? "ring-servido-800" : "ring-transparent"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4 p-4">
          <DialogHeader>
            <DialogTitle className="text-left text-xl">{title}</DialogTitle>
          </DialogHeader>
          {description && <p className="text-sm text-gray-600">{description}</p>}

          {promotion && (
            <ul className="space-y-1 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-950">
              {promotion.includedItems.map((inc) => (
                <li key={inc.menuItemId}>
                  {inc.quantity}x {inc.name}
                </li>
              ))}
            </ul>
          )}

          {item && menuItemHasOptions(item) && !promotion && (
            <div className="space-y-4">
              {groups.map((group) => {
                const selectedIds = new Set(
                  selections.filter((s) => s.groupId === group.id).map((s) => s.optionId)
                )
                return (
                  <div key={group.id} className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {group.name}
                      {group.required ? (
                        <span className="ml-1 text-red-500">*</span>
                      ) : (
                        <span className="ml-1 font-normal text-gray-400">(opcional)</span>
                      )}
                    </p>
                    <div className="space-y-2">
                      {group.options
                        .filter((o) => o.available !== false)
                        .map((option) => {
                          const checked = selectedIds.has(option.id)
                          return (
                            <label
                              key={option.id}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                                checked
                                  ? "border-servido-800 bg-servido-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {group.maxSelect <= 1 ? (
                                  <input
                                    type="radio"
                                    name={group.id}
                                    checked={checked}
                                    onChange={() => toggleOption(group.id, option.id, group.maxSelect)}
                                    className="h-4 w-4"
                                  />
                                ) : (
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      toggleOption(group.id, option.id, group.maxSelect)
                                    }
                                  />
                                )}
                                <span className="text-sm font-medium text-gray-900">{option.name}</span>
                              </div>
                              <span className="text-sm text-gray-600">
                                {option.priceDelta > 0
                                  ? `+$${formatPriceNumber(option.priceDelta)}`
                                  : option.priceDelta < 0
                                    ? `-$${formatPriceNumber(Math.abs(option.priceDelta))}`
                                    : "Incluido"}
                              </span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <p className="text-lg font-semibold text-servido-800">${formatPriceNumber(livePrice)}</p>
          <Button
            className="w-full rounded-full bg-servido-800"
            disabled={!canOrder}
            onClick={handleAdd}
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar · ${formatPriceNumber(livePrice)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
