"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type AdminNavItem = {
  tab: string
  label: string
  icon: LucideIcon
}

export type AdminNavGroup = {
  id: string
  label: string
  items: AdminNavItem[]
}

export function AdminSidebarNav({
  groups,
  activeTab,
  onSelect,
  compact = false,
}: {
  groups: AdminNavGroup[]
  activeTab: string
  onSelect: (tab: string) => void
  compact?: boolean
}) {
  return (
    <nav className={`grid items-start px-3 text-sm font-medium ${compact ? "gap-1 p-4" : "gap-1 py-2"}`}>
      {groups.map((group) => (
        <div key={group.id} className="mb-2">
          <p className="admin-nav-group">{group.label}</p>
          {group.items.map((item) => {
            const active = activeTab === item.tab
            return (
              <Button
                key={item.tab}
                variant="ghost"
                className={`admin-nav-btn mb-1 flex w-full items-center justify-start gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => onSelect(item.tab)}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-teal-300 to-sky-400 shadow-[0_0_18px_rgba(45,212,191,0.55)]" />
                )}
                <item.icon className={`h-4 w-4 ${active ? "text-teal-700" : ""}`} />
                {item.label}
              </Button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
