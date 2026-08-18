"use client"

import { useEffect, useMemo, useState } from "react"

export const ADMIN_PAGE_SIZE = 12

export function usePagedList<T>(items: T[], pageSize = ADMIN_PAGE_SIZE, resetKey = "") {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey, pageSize])

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return useMemo(() => {
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const start = (currentPage - 1) * pageSize
    const slice = items.slice(start, start + pageSize)
    return {
      page: currentPage,
      setPage,
      totalPages,
      slice,
      total,
      pageSize,
      from: total === 0 ? 0 : start + 1,
      to: start + slice.length,
    }
  }, [items, page, pageSize, total, totalPages])
}
