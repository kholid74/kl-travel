import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { OperationsDetailRoute } from "@/features/operations/components/operations-detail"

export const metadata: Metadata = { title: "Detail operasional" }

export default function OperationsDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <OperationsDetailRoute />
    </Suspense>
  )
}
