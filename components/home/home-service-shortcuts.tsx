"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  LayoutGrid,
  Pill,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from "lucide-react"
import { cn } from "@/lib/utils"

const serviceShortcuts: {
  id: string
  label: string
  icon: LucideIcon
  href: string
  circle: string
  shadow: string
  iconAnim: string
}[] = [
  {
    id: "productos",
    label: "Productos",
    icon: ShoppingBag,
    href: "/products",
    circle: "bg-gradient-to-br from-violet-500 via-purple-600 to-servido-800",
    shadow: "shadow-violet-500/40",
    iconAnim: "home-shortcut-float",
  },
  {
    id: "restaurantes",
    label: "Restaurantes",
    icon: UtensilsCrossed,
    href: "/restaurantes",
    circle: "bg-gradient-to-br from-orange-400 via-orange-500 to-red-500",
    shadow: "shadow-orange-500/40",
    iconAnim: "home-shortcut-float-delay-1",
  },
  {
    id: "mercados",
    label: "Mercados",
    icon: Store,
    href: "/proximamente?seccion=mercados",
    circle: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/40",
    iconAnim: "home-shortcut-float-delay-2",
  },
  {
    id: "farmacias",
    label: "Farmacias",
    icon: Pill,
    href: "/proximamente?seccion=farmacias",
    circle: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/40",
    iconAnim: "home-shortcut-float-delay-3",
  },
  {
    id: "mas",
    label: "Más",
    icon: LayoutGrid,
    href: "/proximamente?seccion=mas",
    circle: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-servido-900",
    shadow: "shadow-purple-500/40",
    iconAnim: "home-shortcut-float-delay-4",
  },
]

export function HomeServiceShortcuts() {
  return (
    <div className="px-4 pb-2 pt-3">
      <div className="rounded-3xl bg-white px-4 py-5 shadow-md shadow-black/[0.08] ring-1 ring-black/[0.04]">
        <div className="grid grid-cols-5 gap-x-1.5">
          {serviceShortcuts.map(({ id, label, icon: Icon, href, circle, shadow, iconAnim }, index) => (
            <Link
              key={id}
              href={href}
              className="home-shortcut-enter group flex flex-col items-center gap-2 rounded-2xl py-0.5 text-center"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
                <span
                  className={cn(
                    "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-2 ring-white/90 xs:h-[3.25rem] xs:w-[3.25rem]",
                    circle,
                    shadow,
                    "shadow-lg",
                    iconAnim
                  )}
                >
                  <span className="absolute inset-0 rounded-full bg-white/25 opacity-60" />
                  <span className="absolute inset-0 rounded-full bg-gradient-to-t from-black/10 to-white/30" />
                  <Icon
                    className="relative h-5 w-5 text-white drop-shadow-md xs:h-[1.35rem] xs:w-[1.35rem]"
                    strokeWidth={2.25}
                  />
                </span>
              </span>
              <span className="block min-h-[2.4em] w-full px-0.5 text-[10px] font-semibold leading-[1.25] text-gray-800 transition-colors group-hover:text-servido-800 xs:text-[11px] [overflow-wrap:anywhere]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
