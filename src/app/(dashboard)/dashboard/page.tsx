import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { OverviewPage } from "@/features/overview/components/overview-page"

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="overview" />}>
      <OverviewPage />
    </Suspense>
  )
}
