"use client"

import Link from "next/link"
import { Compass, Heart, Home, ShoppingBag, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"

export function TabBar() {
  const { currentUser, authLoading, getDashboardLink } = useAuth()
  const pathname = usePathname()

  const tabItems = [
    {
      name: "Inicio",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      name: "Explorar",
      icon: Compass,
      href: "/products",
      active:
        pathname.startsWith("/products") ||
        pathname.startsWith("/product") ||
        pathname.startsWith("/category") ||
        pathname.startsWith("/search"),
    },
    {
      name: "Pedidos",
      icon: ShoppingBag,
      href: currentUser ? "/dashboard/buyer" : "/login",
      active: pathname.startsWith("/dashboard/buyer") || pathname.startsWith("/purchase"),
    },
    {
      name: "Favoritos",
      icon: Heart,
      href: "/favorites",
      active: pathname === "/favorites",
    },
    {
      name: "Mi Cuenta",
      icon: User,
      href: getDashboardLink(),
      active:
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname === "/login" ||
        pathname === "/signup",
    },
  ]

  if (authLoading) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(76,29,149,0.08)] lg:hidden">
      <nav className="mx-auto flex h-16 max-w-screen-sm items-center justify-around px-1">
        {tabItems.map((item) => (
          <Link key={item.name} href={item.href} className="min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={`flex h-full w-full min-w-0 flex-col gap-0.5 px-1 py-2 text-xs ${
                item.active
                  ? "font-semibold text-servido-700"
                  : "text-gray-500 hover:text-servido-600"
              }`}
            >
              <item.icon
                className={`h-5 w-5 shrink-0 ${item.active ? "text-servido-700" : ""}`}
              />
              <span className="truncate text-[10px] leading-tight">{item.name}</span>
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  )
}
