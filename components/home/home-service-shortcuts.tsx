"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

const serviceShortcuts: {
  id: string
  label: string
  emoji: string
  href: string
  circle: string
  shadow: string
  iconAnim: string
}[] = [
  {
    id: "productos",
    label: "Productos",
    emoji: "🛍️",
    href: "/products",
    circle: "bg-gradient-to-br from-violet-500 via-purple-600 to-servido-800",
    shadow: "shadow-violet-500/40",
    iconAnim: "home-shortcut-float",
  },
  {
    id: "delivery",
    label: "Delivery",
    emoji: "🍔",
    href: "/restaurantes",
    circle: "bg-gradient-to-br from-orange-400 via-orange-500 to-red-500",
    shadow: "shadow-orange-500/40",
    iconAnim: "home-shortcut-float-delay-1",
  },
  {
    id: "super",
    label: "Súper",
    emoji: "🛒",
    href: "/proximamente?seccion=mercados",
    circle: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/40",
    iconAnim: "home-shortcut-float-delay-2",
  },
  {
    id: "farmacia",
    label: "Farmacia",
    emoji: "💊",
    href: "/proximamente?seccion=farmacias",
    circle: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/40",
    iconAnim: "home-shortcut-float-delay-3",
  },
  {
    id: "envios",
    label: "Envíos",
    emoji: "🚚",
    href: "/proximamente?seccion=envios",
    circle: "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600",
    shadow: "shadow-amber-500/40",
    iconAnim: "home-shortcut-float-delay-4",
  },
  {
    id: "servicios",
    label: "Servicios",
    emoji: "⚡",
    href: "/services",
    circle: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-servido-900",
    shadow: "shadow-purple-500/40",
    iconAnim: "home-shortcut-float-delay-1",
  },
]

export function HomeServiceShortcuts() {
  return (
    <div className="pb-2 pt-3">
      <div className="mx-4 rounded-3xl bg-white py-3 shadow-md shadow-black/[0.08] ring-1 ring-black/[0.04] sm:py-4">
        <div
          className="flex gap-1 overflow-x-auto px-3 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:gap-2 sm:px-4 [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {serviceShortcuts.map(({ id, label, emoji, href, circle, shadow, iconAnim }, index) => (
            <Link
              key={id}
              href={href}
              className="home-shortcut-enter group flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl py-0.5 text-center xs:w-[4.75rem] sm:w-[5.25rem]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
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
                  <span className="relative text-xl leading-none drop-shadow-md xs:text-2xl" aria-hidden>
                    {emoji}
                  </span>
                </span>
              </span>
              <span className="block w-full px-0.5 text-[10px] font-semibold leading-tight text-gray-800 transition-colors group-hover:text-servido-800 xs:text-[11px]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
