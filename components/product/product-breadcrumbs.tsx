import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface ProductBreadcrumbsProps {
  category?: { id: string; name: string } | null
  productName: string
}

export function ProductBreadcrumbs({ category, productName }: ProductBreadcrumbsProps) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-purple-50 hover:text-purple-800"
      >
        <Home className="h-3.5 w-3.5" />
        Inicio
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
      <Link
        href="/products"
        className="rounded-lg px-2 py-1 transition-colors hover:bg-purple-50 hover:text-purple-800"
      >
        Productos
      </Link>
      {category && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <Link
            href={`/category/${category.id}`}
            className="max-w-[140px] truncate rounded-lg px-2 py-1 transition-colors hover:bg-purple-50 hover:text-purple-800 sm:max-w-none"
          >
            {category.name}
          </Link>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
      <span className="max-w-[160px] truncate font-medium text-gray-900 sm:max-w-xs">{productName}</span>
    </nav>
  )
}
