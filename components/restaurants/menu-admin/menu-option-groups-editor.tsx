"use client"

import { Plus, Trash2 } from "lucide-react"
import type { MenuOptionGroup, MenuOptionGroupKind } from "@/types/restaurant"
import { createLocalId } from "@/lib/restaurant-options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MenuOptionGroupsEditorProps {
  groups: MenuOptionGroup[]
  onChange: (groups: MenuOptionGroup[]) => void
}

export function MenuOptionGroupsEditor({ groups, onChange }: MenuOptionGroupsEditorProps) {
  const updateGroup = (groupId: string, patch: Partial<MenuOptionGroup>) => {
    onChange(groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)))
  }

  const addGroup = (kind: MenuOptionGroupKind) => {
    const group: MenuOptionGroup = {
      id: createLocalId("group"),
      name: kind === "variant" ? "Tamaño" : "Extras",
      kind,
      required: kind === "variant",
      minSelect: kind === "variant" ? 1 : 0,
      maxSelect: kind === "variant" ? 1 : 3,
      sortOrder: groups.length,
      options: [
        {
          id: createLocalId("option"),
          name: kind === "variant" ? "Chico" : "Extra queso",
          priceDelta: 0,
          available: true,
          isDefault: kind === "variant",
          sortOrder: 0,
        },
      ],
    }
    onChange([...groups, group])
  }

  const removeGroup = (groupId: string) => {
    onChange(groups.filter((g) => g.id !== groupId))
  }

  const addOption = (groupId: string) => {
    onChange(
      groups.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          options: [
            ...g.options,
            {
              id: createLocalId("option"),
              name: "",
              priceDelta: 0,
              available: true,
              isDefault: false,
              sortOrder: g.options.length,
            },
          ],
        }
      })
    )
  }

  const updateOption = (
    groupId: string,
    optionId: string,
    patch: Partial<MenuOptionGroup["options"][number]>
  ) => {
    onChange(
      groups.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          options: g.options.map((o) => {
            if (o.id !== optionId) {
              // Only one default for single-select groups
              if (patch.isDefault === true && g.maxSelect <= 1) {
                return { ...o, isDefault: false }
              }
              return o
            }
            return { ...o, ...patch }
          }),
        }
      })
    )
  }

  const removeOption = (groupId: string, optionId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g
      )
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-base">Opciones del producto</Label>
          <p className="text-xs text-gray-500">
            Variantes (tamaño, porciones, sabor) y extras con precio adicional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => addGroup("variant")}>
            <Plus className="mr-1 h-4 w-4" />
            Variante
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => addGroup("extra")}>
            <Plus className="mr-1 h-4 w-4" />
            Extras
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500">Sin opciones. El producto se vende solo con el precio base.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="space-y-3 rounded-xl bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nombre del grupo</Label>
                    <Input
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      placeholder="Ej: Tamaño, Porciones, Sabor"
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select
                      value={group.kind}
                      onValueChange={(value: MenuOptionGroupKind) =>
                        updateGroup(group.id, {
                          kind: value,
                          maxSelect: value === "variant" ? 1 : Math.max(group.maxSelect, 3),
                          minSelect: value === "variant" ? 1 : 0,
                          required: value === "variant",
                        })
                      }
                    >
                      <SelectTrigger className="rounded-xl bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="variant">Variante (una opción)</SelectItem>
                        <SelectItem value="extra">Extras (varias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGroup(group.id)}
                  aria-label="Eliminar grupo"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={group.required}
                    onCheckedChange={(checked) =>
                      updateGroup(group.id, {
                        required: checked,
                        minSelect: checked ? Math.max(group.minSelect, 1) : 0,
                      })
                    }
                  />
                  Obligatorio
                </label>
                {group.kind === "extra" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Label className="whitespace-nowrap">Máx.</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-16 rounded-lg bg-white"
                      value={group.maxSelect}
                      onChange={(e) =>
                        updateGroup(group.id, { maxSelect: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {group.options.map((option) => (
                  <div key={option.id} className="grid grid-cols-[1fr_90px_auto_auto] items-center gap-2">
                    <Input
                      value={option.name}
                      onChange={(e) => updateOption(group.id, option.id, { name: e.target.value })}
                      placeholder="Nombre opción"
                      className="rounded-xl bg-white"
                    />
                    <Input
                      type="number"
                      value={option.priceDelta}
                      onChange={(e) =>
                        updateOption(group.id, option.id, { priceDelta: Number(e.target.value) || 0 })
                      }
                      placeholder="+$"
                      className="rounded-xl bg-white"
                      title="Precio adicional"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <Switch
                        checked={option.isDefault === true}
                        onCheckedChange={(checked) =>
                          updateOption(group.id, option.id, { isDefault: checked })
                        }
                      />
                      Def
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(group.id, option.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => addOption(group.id)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Opción
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
