"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { useTranslations } from "next-intl"
import { categoryHref } from "@/lib/routes"

interface ProductBreadcrumbsProps {
  category?: { id: string; name: string } | null
  productName: string
}

export function ProductBreadcrumbs({ category, productName }: ProductBreadcrumbsProps) {
  const tp = useTranslations("product")

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-servido-50 hover:text-servido-800"
      >
        <Home className="h-3.5 w-3.5" />
        {tp("home")}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      <Link
        href="/products"
        className="rounded-lg px-2 py-1 transition-colors hover:bg-servido-50 hover:text-servido-800"
      >
        {tp("products")}
      </Link>
      {category && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          <Link
            href={categoryHref(category.id)}
            className="max-w-[140px] truncate rounded-lg px-2 py-1 transition-colors hover:bg-servido-50 hover:text-servido-800 sm:max-w-none"
          >
            {category.name}
          </Link>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      <span className="max-w-[160px] truncate font-medium text-servido-950 sm:max-w-xs">{productName}</span>
    </nav>
  )
}
