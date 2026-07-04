export function HomeBannerSkeleton() {
  return (
    <div className="aspect-[16/9] animate-pulse overflow-hidden rounded-3xl bg-gradient-to-r from-purple-200 via-purple-100 to-violet-200 sm:aspect-[16/7] md:aspect-[16/5]" />
  )
}

export function HomeCategoriesSkeleton() {
  return (
    <>
      <div className="hidden gap-4 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden sm:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] w-[70%] shrink-0 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    </>
  )
}

export function HomeProductsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[45%] shrink-0 sm:w-1/3 md:w-1/4 lg:w-1/5">
          <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
            <div className="aspect-square animate-pulse bg-gray-200" />
            <div className="space-y-2 p-4">
              <div className="h-4 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
