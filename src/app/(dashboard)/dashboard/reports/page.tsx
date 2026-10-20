import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { ReportsPage } from "@/features/reports/components/reports-page"

export const metadata: Metadata = { title: "Laporan" }

export default function ReportsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsPage />
    </Suspense>
  )
}
