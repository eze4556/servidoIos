"use client"

import { cn } from "@/lib/utils"

interface CategoryItem {
  id: string
  name: string
}

interface HomeCategoryPillsProps {
  categories: CategoryItem[]
  selectedId: string
  onSelect: (id: string) => void
}

export function HomeCategoryPills({ categories, selectedId, onSelect }: HomeCategoryPillsProps) {
  const pills = [{ id: "all", name: "Todas" }, ...categories.slice(0, 8)]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onSelect(pill.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            selectedId === pill.id
              ? "bg-servido-700 text-white shadow-md shadow-servido-700/25"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          {pill.name}
        </button>
      ))}
    </div>
  )
}
