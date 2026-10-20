import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { DepartureDetailRoute } from "@/features/departures/components/departure-detail"

export const metadata: Metadata = { title: "Detail keberangkatan" }

export default function DepartureDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <DepartureDetailRoute />
    </Suspense>
  )
}
