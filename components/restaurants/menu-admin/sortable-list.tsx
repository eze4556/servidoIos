"use client"

import type { ReactNode } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortableListProps<T extends { id: string }> {
  items: T[]
  onReorder: (next: T[]) => void
  renderItem: (item: T, handle: ReactNode) => ReactNode
  disabled?: boolean
  className?: string
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled,
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  if (disabled) {
    return (
      <div className={className}>
        {items.map((item) => renderItem(item, null))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  id,
  children,
}: {
  id: string
  children: (handle: ReactNode) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "relative z-10 opacity-90")}
    >
      {children(
        <button
          type="button"
          className="touch-none rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Arrastrar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

interface HorizontalSortableListProps<T extends { id: string }> {
  items: T[]
  onReorder: (next: T[]) => void
  renderItem: (item: T, handle: ReactNode) => ReactNode
  className?: string
}

export function HorizontalSortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: HorizontalSortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("flex flex-wrap gap-3", className)}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
