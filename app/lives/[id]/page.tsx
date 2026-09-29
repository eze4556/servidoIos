import { Suspense } from "react"
import { LiveViewer } from "@/components/lives/live-viewer"

export default async function LiveByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <LiveViewer liveId={id} />
    </Suspense>
  )
}
