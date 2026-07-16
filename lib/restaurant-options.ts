import type {
  FoodOrderItemSelection,
  MenuItem,
  MenuOption,
  MenuOptionGroup,
  MenuPromotion,
  MenuPromotionIncludedItem,
} from "@/types/restaurant"

export type SelectionInput = {
  groupId: string
  optionId: string
}

export function createLocalId(prefix = "opt"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function sortOptionGroups(groups: MenuOptionGroup[] | undefined): MenuOptionGroup[] {
  if (!Array.isArray(groups)) return []
  return [...groups]
    .map((group) => ({
      ...group,
      options: [...(group.options || [])].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
        return a.name.localeCompare(b.name, "es")
      }),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name, "es")
    })
}

export function getMenuItemFromPrice(item: Pick<MenuItem, "price" | "optionGroups">): number {
  const base = Number(item.price) || 0
  const groups = sortOptionGroups(item.optionGroups)
  if (groups.length === 0) return base

  let minExtra = 0
  for (const group of groups) {
    const available = group.options.filter((o) => o.available !== false)
    if (available.length === 0) continue
    const need = Math.max(group.minSelect || 0, group.required ? 1 : 0)
    if (need <= 0) continue
    const sorted = [...available].sort(
      (a, b) => (Number(a.priceDelta) || 0) - (Number(b.priceDelta) || 0)
    )
    for (let i = 0; i < Math.min(need, sorted.length); i++) {
      minExtra += Number(sorted[i].priceDelta) || 0
    }
  }
  return roundMoney(base + minExtra)
}

export function buildLineKey(
  menuItemId: string,
  selections: SelectionInput[] | FoodOrderItemSelection[] = [],
  promotionId?: string | null
): string {
  if (promotionId) return `promo:${promotionId}`
  const parts = [...selections]
    .map((s) => `${s.groupId}:${s.optionId}`)
    .sort((a, b) => a.localeCompare(b))
  return `${menuItemId}|${parts.join(",")}`
}

export function resolveMenuItemSelections(
  item: MenuItem,
  selectionInputs: SelectionInput[] = []
): { selections: FoodOrderItemSelection[]; unitPrice: number; displayName: string; lineKey: string } {
  const groups = sortOptionGroups(item.optionGroups)
  const inputsByGroup = new Map<string, string[]>()
  for (const sel of selectionInputs) {
    const list = inputsByGroup.get(sel.groupId) || []
    list.push(sel.optionId)
    inputsByGroup.set(sel.groupId, list)
  }

  const resolved: FoodOrderItemSelection[] = []

  for (const group of groups) {
    const availableOptions = group.options.filter((o) => o.available !== false)
    let chosenIds = inputsByGroup.get(group.id) || []

    // Apply defaults if nothing chosen and group allows
    if (chosenIds.length === 0) {
      const defaults = availableOptions.filter((o) => o.isDefault).map((o) => o.id)
      if (defaults.length > 0) chosenIds = defaults.slice(0, Math.max(group.maxSelect, 1))
    }

    const minNeed = Math.max(group.minSelect || 0, group.required ? 1 : 0)
    if (chosenIds.length < minNeed) {
      throw new Error(`Elegí ${group.name}`)
    }
    if (chosenIds.length > group.maxSelect) {
      throw new Error(`Podés elegir hasta ${group.maxSelect} en ${group.name}`)
    }

    const unique = Array.from(new Set(chosenIds))
    for (const optionId of unique) {
      const option = availableOptions.find((o) => o.id === optionId)
      if (!option) {
        throw new Error(`Opción no válida en ${group.name}`)
      }
      resolved.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: Number(option.priceDelta) || 0,
      })
    }
  }

  // Reject unknown group ids
  for (const groupId of inputsByGroup.keys()) {
    if (!groups.some((g) => g.id === groupId)) {
      throw new Error("Hay opciones inválidas en el pedido")
    }
  }

  const basePrice = Number(item.price) || 0
  const unitPrice = roundMoney(basePrice + resolved.reduce((sum, s) => sum + s.priceDelta, 0))
  const optionNames = resolved.map((s) => s.optionName)
  const displayName =
    optionNames.length > 0 ? `${item.name} · ${optionNames.join(" · ")}` : item.name

  return {
    selections: resolved,
    unitPrice,
    displayName,
    lineKey: buildLineKey(item.id, resolved),
  }
}

export function getDefaultSelectionInputs(item: MenuItem): SelectionInput[] {
  const groups = sortOptionGroups(item.optionGroups)
  const selections: SelectionInput[] = []
  for (const group of groups) {
    const defaults = group.options.filter((o) => o.available !== false && o.isDefault)
    const pick = defaults.slice(0, Math.max(group.maxSelect, 1))
    for (const option of pick) {
      selections.push({ groupId: group.id, optionId: option.id })
    }
  }
  return selections
}

export function mapOptionGroups(raw: unknown): MenuOptionGroup[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const groups: MenuOptionGroup[] = []
  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== "object") continue
    const data = entry as Record<string, unknown>
    const optionsRaw = Array.isArray(data.options) ? data.options : []
    const options: MenuOption[] = optionsRaw
      .map((opt, optIndex) => {
        if (!opt || typeof opt !== "object") return null
        const o = opt as Record<string, unknown>
        const id = typeof o.id === "string" && o.id ? o.id : createLocalId("option")
        const name = typeof o.name === "string" ? o.name.trim() : ""
        if (!name) return null
        return {
          id,
          name,
          priceDelta: Number(o.priceDelta) || 0,
          available: o.available !== false,
          isDefault: o.isDefault === true,
          sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : optIndex,
        } satisfies MenuOption
      })
      .filter((o): o is MenuOption => Boolean(o))

    const id = typeof data.id === "string" && data.id ? data.id : createLocalId("group")
    const name = typeof data.name === "string" ? data.name.trim() : ""
    if (!name) continue
    const kind = data.kind === "extra" ? "extra" : "variant"
    const maxSelect =
      typeof data.maxSelect === "number" && data.maxSelect > 0
        ? data.maxSelect
        : kind === "variant"
          ? 1
          : Math.max(options.length, 1)
    const minSelect =
      typeof data.minSelect === "number" && data.minSelect >= 0
        ? data.minSelect
        : data.required
          ? 1
          : 0

    groups.push({
      id,
      name,
      kind,
      required: data.required === true || minSelect > 0,
      minSelect,
      maxSelect,
      sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : index,
      options,
    })
  }
  return groups.length ? sortOptionGroups(groups) : undefined
}

export function mapMenuPromotionDoc(id: string, data: Record<string, unknown>): MenuPromotion {
  const includedRaw = Array.isArray(data.includedItems) ? data.includedItems : []
  const includedItems: MenuPromotionIncludedItem[] = includedRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const item = entry as Record<string, unknown>
      const menuItemId = typeof item.menuItemId === "string" ? item.menuItemId : ""
      const name = typeof item.name === "string" ? item.name : ""
      const quantity = Number(item.quantity) || 0
      if (!menuItemId || quantity <= 0) return null
      return { menuItemId, name, quantity }
    })
    .filter((x): x is MenuPromotionIncludedItem => Boolean(x))

  return {
    id,
    restaurantId: String(data.restaurantId || ""),
    name: String(data.name || ""),
    description: typeof data.description === "string" ? data.description : undefined,
    type: "combo",
    available: data.available !== false,
    comboPrice: Number(data.comboPrice) || 0,
    includedItems,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function resolveComboPromotion(promotion: MenuPromotion): {
  unitPrice: number
  displayName: string
  lineKey: string
  includedSummary: string
} {
  if (promotion.available === false) {
    throw new Error(`El combo ${promotion.name} no está disponible`)
  }
  if (!promotion.includedItems.length) {
    throw new Error(`El combo ${promotion.name} no tiene productos`)
  }
  const includedSummary = promotion.includedItems
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(" · ")
  return {
    unitPrice: roundMoney(Number(promotion.comboPrice) || 0),
    displayName: promotion.name,
    lineKey: buildLineKey("combo", [], promotion.id),
    includedSummary,
  }
}

export function sanitizeOptionGroupsForSave(groups: MenuOptionGroup[]): MenuOptionGroup[] {
  return sortOptionGroups(groups)
    .map((group, groupIndex) => {
      const options = group.options
        .filter((o) => o.name.trim())
        .map((option, optionIndex) => ({
          id: option.id || createLocalId("option"),
          name: option.name.trim(),
          priceDelta: Number(option.priceDelta) || 0,
          available: option.available !== false,
          isDefault: option.isDefault === true,
          sortOrder: optionIndex,
        }))
      if (!group.name.trim() || options.length === 0) return null
      const maxSelect = Math.max(1, Math.min(group.maxSelect || 1, options.length))
      const minSelect = Math.max(0, Math.min(group.minSelect || 0, maxSelect))
      return {
        id: group.id || createLocalId("group"),
        name: group.name.trim(),
        kind: group.kind === "extra" ? "extra" : "variant",
        required: group.required || minSelect > 0,
        minSelect,
        maxSelect,
        sortOrder: groupIndex,
        options,
      } satisfies MenuOptionGroup
    })
    .filter((g): g is MenuOptionGroup => Boolean(g))
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}
